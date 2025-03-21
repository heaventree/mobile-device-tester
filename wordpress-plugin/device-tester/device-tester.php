<?php
/**
 * Plugin Name: Device Tester
 * Plugin URI: https://replit.com
 * Description: Test your WordPress site across different devices directly from WordPress admin
 * Version: 1.0.0
 * Author: Replit
 * License: GPL v2 or later
 */

if (!defined('ABSPATH')) {
    exit;
}

class DeviceTester {
    private $plugin_url;
    private $settings_errors = [];
    private $db_version = '1.0';
    private $table_name;
    private $projects_table_name;
    private $api_key_option = 'device_tester_api_key';
    private $connection_status_option = 'device_tester_connection_status';

    public function __construct() {
        global $wpdb;
        $this->table_name = $wpdb->prefix . 'device_tester_stats';
        $this->projects_table_name = $wpdb->prefix . 'device_tester_projects';
        $this->plugin_url = trim(get_option('device_tester_url'), '/');

        // Initialize plugin
        register_activation_hook(__FILE__, array($this, 'install'));
        add_action('admin_init', array($this, 'maybe_upgrade'));
        add_action('rest_api_init', array($this, 'register_rest_routes'));

        // Add admin menu
        add_action('admin_menu', array($this, 'add_admin_menu'));

        // Add admin bar menu
        add_action('admin_bar_menu', array($this, 'add_admin_bar_button'), 100);

        // Register settings
        add_action('admin_init', array($this, 'register_settings'));

        // Add dashboard widget
        add_action('wp_dashboard_setup', array($this, 'add_dashboard_widget'));

        // Register shortcode
        add_shortcode('device_tester', array($this, 'render_shortcode'));

        // Add admin styles
        add_action('admin_enqueue_scripts', array($this, 'enqueue_admin_styles'));

        // Add meta box
        add_action('add_meta_boxes', array($this, 'add_meta_box'));

        // Add AJAX handlers
        add_action('wp_ajax_record_device_test', array($this, 'record_device_test'));
        add_action('wp_ajax_nopriv_record_device_test', array($this, 'record_device_test'));
    }

    public function install() {
        global $wpdb;

        $charset_collate = $wpdb->get_charset_collate();

        // Create stats table
        $sql = "CREATE TABLE IF NOT EXISTS $this->table_name (
            id mediumint(9) NOT NULL AUTO_INCREMENT,
            page_id bigint(20) NOT NULL,
            test_date datetime DEFAULT CURRENT_TIMESTAMP,
            device_type varchar(50) NOT NULL,
            PRIMARY KEY  (id),
            KEY page_id (page_id)
        ) $charset_collate;";

        // Create projects table
        $sql .= "CREATE TABLE IF NOT EXISTS $this->projects_table_name (
            id mediumint(9) NOT NULL AUTO_INCREMENT,
            site_name varchar(255) NOT NULL,
            site_url varchar(255) NOT NULL,
            api_key varchar(64) NOT NULL,
            connection_status varchar(20) DEFAULT 'disconnected',
            last_scan datetime DEFAULT NULL,
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY  (id),
            UNIQUE KEY api_key (api_key)
        ) $charset_collate;";

        // Add new table for CSS changes
        $sql .= "CREATE TABLE IF NOT EXISTS {$wpdb->prefix}device_tester_css_changes (
            id mediumint(9) NOT NULL AUTO_INCREMENT,
            page_id bigint(20) NOT NULL,
            css_content text NOT NULL,
            applied_at datetime DEFAULT CURRENT_TIMESTAMP,
            applied_by bigint(20) NOT NULL,
            status enum('active', 'reverted') DEFAULT 'active',
            reverted_at datetime DEFAULT NULL,
            reverted_by bigint(20) DEFAULT NULL,
            device_type varchar(50) NOT NULL,
            PRIMARY KEY  (id),
            KEY page_id (page_id),
            KEY status (status)
        ) $charset_collate;";

        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        dbDelta($sql);

        add_option('device_tester_db_version', $this->db_version);

        // Generate initial API key if not exists
        if (!get_option($this->api_key_option)) {
            $this->generate_api_key();
        }
    }

    public function add_admin_menu() {
        // Main menu
        add_menu_page(
            'Device Tester',
            'Device Tester',
            'manage_options',
            'device-tester',
            array($this, 'render_admin_page'),
            'dashicons-smartphone'
        );

        // Projects submenu
        add_submenu_page(
            'device-tester',
            'Projects',
            'Projects',
            'manage_options',
            'device-tester-projects',
            array($this, 'render_projects_page')
        );

        // Settings submenu
        add_submenu_page(
            'device-tester',
            'Settings',
            'Settings',
            'manage_options',
            'device-tester-settings',
            array($this, 'render_settings_page')
        );
    }

    public function render_projects_page() {
        global $wpdb;

        // Get all projects/connected sites
        $projects = $wpdb->get_results("
            SELECT * FROM $this->projects_table_name 
            ORDER BY created_at DESC
        ");

        ?>
        <div class="wrap">
            <h1>Device Tester Projects</h1>

            <div class="card">
                <h2>Connected Sites</h2>

                <?php if (empty($projects)): ?>
                    <p>No sites connected yet. Use your API key to connect sites to the Device Tester platform.</p>
                <?php else: ?>
                    <table class="wp-list-table widefat fixed striped">
                        <thead>
                            <tr>
                                <th>Site Name</th>
                                <th>URL</th>
                                <th>Status</th>
                                <th>Last Scan</th>
                                <th>Connected Since</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach ($projects as $project): ?>
                                <tr>
                                    <td><?php echo esc_html($project->site_name); ?></td>
                                    <td>
                                        <a href="<?php echo esc_url($project->site_url); ?>" target="_blank">
                                            <?php echo esc_html($project->site_url); ?>
                                        </a>
                                    </td>
                                    <td>
                                        <span class="status-<?php echo esc_attr($project->connection_status); ?>">
                                            <?php echo esc_html(ucfirst($project->connection_status)); ?>
                                        </span>
                                    </td>
                                    <td>
                                        <?php 
                                        echo $project->last_scan 
                                            ? esc_html(human_time_diff(strtotime($project->last_scan))) . ' ago'
                                            : 'Never';
                                        ?>
                                    </td>
                                    <td>
                                        <?php echo esc_html(human_time_diff(strtotime($project->created_at))); ?> ago
                                    </td>
                                </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                <?php endif; ?>
            </div>

            <style>
                .status-connected {
                    color: #46b450;
                }
                .status-disconnected {
                    color: #dc3232;
                }
                .status-error {
                    color: #ffb900;
                }
            </style>
        </div>
        <?php
    }

    private function generate_api_key() {
        $api_key = wp_generate_password(32, false);
        update_option($this->api_key_option, $api_key);
        return $api_key;
    }

    public function register_rest_routes() {
        register_rest_route('device-tester/v1', '/site-info', array(
            'methods' => 'GET',
            'callback' => array($this, 'get_site_info'),
            'permission_callback' => array($this, 'verify_api_key')
        ));

        register_rest_route('device-tester/v1', '/update-status', array(
            'methods' => 'POST',
            'callback' => array($this, 'update_connection_status'),
            'permission_callback' => array($this, 'verify_api_key')
        ));

        register_rest_route('device-tester/v1', '/register-site', array(
            'methods' => 'POST',
            'callback' => array($this, 'register_site'),
            'permission_callback' => array($this, 'verify_api_key')
        ));

        // Add new routes for CSS management
        register_rest_route('device-tester/v1', '/css', array(
            'methods' => 'POST',
            'callback' => array($this, 'handle_css_apply'),
            'permission_callback' => array($this, 'verify_api_key'),
            'args' => array(
                'page_id' => array(
                    'required' => true,
                    'type' => 'integer'
                ),
                'css_content' => array(
                    'required' => true,
                    'type' => 'string'
                ),
                'device_type' => array(
                    'required' => true,
                    'type' => 'string'
                )
            )
        ));

        register_rest_route('device-tester/v1', '/css/revert/(?P<id>\d+)', array(
            'methods' => 'POST',
            'callback' => array($this, 'handle_css_revert'),
            'permission_callback' => array($this, 'verify_api_key'),
            'args' => array(
                'id' => array(
                    'required' => true,
                    'type' => 'integer'
                )
            )
        ));
    }

    public function register_site($request) {
        global $wpdb;

        $site_name = sanitize_text_field($request->get_param('site_name'));
        $site_url = esc_url_raw($request->get_param('site_url'));
        $api_key = $request->get_header('X-Device-Tester-Key');

        // Check if site already exists
        $existing = $wpdb->get_var($wpdb->prepare(
            "SELECT id FROM $this->projects_table_name WHERE api_key = %s",
            $api_key
        ));

        if ($existing) {
            // Update existing site
            $wpdb->update(
                $this->projects_table_name,
                array(
                    'site_name' => $site_name,
                    'site_url' => $site_url,
                    'connection_status' => 'connected',
                    'updated_at' => current_time('mysql')
                ),
                array('api_key' => $api_key)
            );
        } else {
            // Insert new site
            $wpdb->insert(
                $this->projects_table_name,
                array(
                    'site_name' => $site_name,
                    'site_url' => $site_url,
                    'api_key' => $api_key,
                    'connection_status' => 'connected'
                )
            );
        }

        return array(
            'status' => 'success',
            'message' => 'Site registered successfully'
        );
    }


    public function verify_api_key($request) {
        $auth_header = $request->get_header('X-Device-Tester-Key');
        if (!$auth_header) {
            return false;
        }
        return $auth_header === get_option($this->api_key_option);
    }

    public function get_site_info($request) {
        return array(
            'name' => get_bloginfo('name'),
            'url' => get_site_url(),
            'version' => get_bloginfo('version'),
            'status' => get_option($this->connection_status_option, 'disconnected')
        );
    }

    public function update_connection_status($request) {
        $status = sanitize_text_field($request->get_param('status'));
        if (!in_array($status, array('connected', 'disconnected', 'error'))) {
            return new WP_Error('invalid_status', 'Invalid status provided');
        }

        update_option($this->connection_status_option, $status);
        return array('status' => 'success');
    }

    public function maybe_upgrade() {
        if (get_option('device_tester_db_version') != $this->db_version) {
            $this->install();
        }
    }

    public function record_device_test() {
        global $wpdb;

        $page_id = intval($_POST['page_id']);
        $device_type = sanitize_text_field($_POST['device_type']);

        $wpdb->insert(
            $this->table_name,
            array(
                'page_id' => $page_id,
                'device_type' => $device_type
            ),
            array('%d', '%s')
        );

        wp_send_json_success();
    }

    public function add_meta_box() {
        $excluded_types = get_option('device_tester_excluded_types', array());
        $screen = get_current_screen();

        if (!in_array($screen->post_type, $excluded_types)) {
            add_meta_box(
                'device_tester_meta_box',
                'Device Testing',
                array($this, 'render_meta_box'),
                null,
                'side',
                'high'
            );
        }
    }

    public function render_meta_box($post) {
        global $wpdb;

        // Get test statistics
        $stats = $wpdb->get_results($wpdb->prepare(
            "SELECT device_type, COUNT(*) as count 
             FROM $this->table_name 
             WHERE page_id = %d 
             GROUP BY device_type",
            $post->ID
        ));

        $test_url = $this->plugin_url . '?url=' . urlencode(get_permalink($post->ID));
        ?>
        <div class="device-tester-meta-box">
            <p>
                <a href="<?php echo esc_url($test_url); ?>" 
                   target="_blank" 
                   class="button button-primary">
                    Test on Devices
                </a>
            </p>

            <?php if ($stats): ?>
                <h4>Testing History</h4>
                <ul class="device-test-stats">
                    <?php foreach ($stats as $stat): ?>
                        <li>
                            <?php echo esc_html($stat->device_type); ?>: 
                            <?php echo esc_html($stat->count); ?> tests
                        </li>
                    <?php endforeach; ?>
                </ul>
            <?php endif; ?>
        </div>
        <style>
            .device-test-stats {
                margin-top: 10px;
                padding-left: 20px;
                list-style: disc;
            }
        </style>
        <?php
    }

    public function enqueue_admin_styles() {
        ?>
        <style>
            .device-tester-settings {
                max-width: 600px;
                margin: 20px 0;
                background: #fff;
                padding: 20px;
                border: 1px solid #ccd0d4;
                box-shadow: 0 1px 1px rgba(0,0,0,.04);
            }
            .device-tester-settings h2 {
                margin-top: 0;
                padding-bottom: 10px;
                border-bottom: 1px solid #eee;
            }
            .device-tester-field {
                margin: 15px 0;
            }
            .device-tester-field label {
                display: block;
                margin-bottom: 5px;
                font-weight: 600;
            }
            .device-tester-field input[type="url"] {
                width: 100%;
                padding: 8px;
            }
            .device-tester-field .description {
                color: #666;
                font-style: italic;
                margin-top: 5px;
            }
            .excluded-types-list {
                margin-top: 10px;
                padding: 10px;
                background: #f8f9fa;
                border: 1px solid #e2e4e7;
                border-radius: 4px;
            }
            .excluded-types-list label {
                display: block;
                margin: 5px 0;
            }
            .card {
                max-width: 800px;
                background: white;
                padding: 20px;
                margin-top: 20px;
                border: 1px solid #ccd0d4;
                box-shadow: 0 1px 1px rgba(0,0,0,.04);
            }
        </style>
        <?php
    }

    public function add_admin_bar_button($admin_bar) {
        if (!is_admin() && $this->plugin_url) {
            $excluded_types = get_option('device_tester_excluded_types', array());
            $post_type = get_post_type();

            if (!in_array($post_type, $excluded_types)) {
                $current_url = urlencode(get_permalink());
                $test_url = $this->plugin_url . '?url=' . $current_url;

                $admin_bar->add_menu(array(
                    'id'    => 'device-tester',
                    'title' => 'Test on Devices',
                    'href'  => $test_url,
                    'meta'  => array(
                        'title' => 'Test this page on different devices',
                        'target' => '_blank',
                        'class' => 'device-tester-button'
                    )
                ));
            }
        }
    }

    public function render_shortcode($atts) {
        $atts = shortcode_atts(array(
            'height' => '600px',
            'width' => '100%',
            'theme' => 'light',
            'devices' => '',  // Comma-separated list of device IDs to show
            'url' => ''      // Optional specific URL to test
        ), $atts);

        if (!$this->plugin_url) {
            return '<!-- Device Tester URL not configured -->';
        }

        $url = !empty($atts['url']) ? $atts['url'] : get_permalink();
        $test_url = $this->plugin_url . '?url=' . urlencode($url);

        if (!empty($atts['devices'])) {
            $test_url .= '&devices=' . urlencode($atts['devices']);
        }

        $styles = sprintf(
            'width: %s; height: %s; border: none; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);',
            esc_attr($atts['width']),
            esc_attr($atts['height'])
        );

        if ($atts['theme'] === 'dark') {
            $styles .= 'background: #1a1a1a;';
        }

        return sprintf(
            '<div class="device-tester-embed">
                <iframe src="%s" style="%s"></iframe>
            </div>',
            esc_url($test_url),
            $styles
        );
    }

    public function add_dashboard_widget() {
        wp_add_dashboard_widget(
            'device_tester_widget',
            'Device Testing Status',
            array($this, 'render_dashboard_widget')
        );
    }

    public function render_dashboard_widget() {
        global $wpdb;

        if (!$this->plugin_url) {
            echo '<p>Please configure the Device Tester URL in settings.</p>';
            return;
        }

        // Get testing statistics
        $stats = $wpdb->get_results("
            SELECT p.post_title, p.ID, COUNT(*) as test_count
            FROM {$wpdb->posts} p
            JOIN {$this->table_name} t ON p.ID = t.page_id
            WHERE p.post_status = 'publish'
            GROUP BY p.ID
            ORDER BY test_count DESC
            LIMIT 5
        ");

        echo '<div class="device-tester-widget">';

        if ($stats) {
            echo '<h4>Most Tested Pages</h4>';
            echo '<ul style="margin-left: 1em; list-style: disc;">';
            foreach ($stats as $stat) {
                $test_url = $this->plugin_url . '?url=' . urlencode(get_permalink($stat->ID));
                printf(
                    '<li><a href="%s" target="_blank">%s</a> (%d tests)</li>',
                    esc_url($test_url),
                    esc_html($stat->post_title),
                    $stat->test_count
                );
            }
            echo '</ul>';
        }

        // Get recent pages
        echo '<h4>Recently Modified Pages</h4>';
        echo '<ul style="margin-left: 1em; list-style: disc;">';

        $recent_pages = get_posts(array(
            'post_type' => 'page',
            'posts_per_page' => 5,
            'orderby' => 'modified',
            'order' => 'DESC'
        ));

        foreach ($recent_pages as $page) {
            $test_url = $this->plugin_url . '?url=' . urlencode(get_permalink($page->ID));
            printf(
                '<li><a href="%s" target="_blank">%s</a></li>',
                esc_url($test_url),
                esc_html($page->post_title)
            );
        }

        echo '</ul>';
        echo '</div>';
    }

    public function render_settings_page() {
        ?>
        <div class="wrap">
            <div class="device-tester-settings">
                <h2>Device Tester Settings</h2>
                <form method="post" action="options.php">
                    <?php settings_fields('device_tester_settings'); ?>
                    <div class="device-tester-field">
                        <label for="device_tester_url">Device Tester URL</label>
                        <input 
                            type="url" 
                            id="device_tester_url"
                            name="device_tester_url" 
                            value="<?php echo esc_attr(get_option('device_tester_url')); ?>" 
                            placeholder="https://your-device-tester-url.repl.co"
                        />
                        <p class="description">Enter the URL of your device testing platform. This should be the URL where your device testing application is hosted.</p>
                    </div>

                    <div class="device-tester-field">
                        <h3>Excluded Post Types</h3>
                        <p class="description">Select which post types should not show the device testing options:</p>
                        <div class="excluded-types-list">
                            <?php
                            $excluded_types = get_option('device_tester_excluded_types', array());
                            $post_types = get_post_types(array('public' => true), 'objects');

                            foreach ($post_types as $type) {
                                printf(
                                    '<label>
                                        <input type="checkbox" name="device_tester_excluded_types[]" value="%s" %s>
                                        %s
                                    </label>',
                                    esc_attr($type->name),
                                    in_array($type->name, $excluded_types) ? 'checked' : '',
                                    esc_html($type->label)
                                );
                            }
                            ?>
                        </div>
                    </div>

                    <div class="device-tester-field">
                        <h3>Shortcode Usage</h3>
                        <p>Use the following shortcode to embed the device tester in your pages:</p>
                        <code>[device_tester]</code>
                        <p class="description">Available attributes:</p>
                        <ul style="list-style: disc; margin-left: 20px;">
                            <li><code>height</code> - Set iframe height (default: 600px)</li>
                            <li><code>width</code> - Set iframe width (default: 100%)</li>
                            <li><code>theme</code> - Choose 'light' or 'dark' theme</li>
                            <li><code>devices</code> - Comma-separated list of device IDs to show</li>
                            <li><code>url</code> - Specific URL to test (defaults to current page)</li>
                        </ul>
                        <p>Example:</p>
                        <code>[device_tester height="800px" theme="dark" devices="iphone-15,pixel-8-pro"]</code>
                    </div>

                    <?php submit_button(); ?>
                </form>
            </div>
        </div>
        <?php
    }

    public function render_admin_page() {
        $api_key = get_option($this->api_key_option);
        $connection_status = get_option($this->connection_status_option, 'disconnected');
        ?>
        <div class="wrap">
            <h1>Device Tester Settings</h1>

            <div class="card">
                <h2>Connection Status</h2>
                <p>Current Status: <strong><?php echo esc_html(ucfirst($connection_status)); ?></strong></p>

                <h3>API Key</h3>
                <p>Use this API key to connect your site to the Device Tester platform:</p>
                <input type="text" 
                       readonly 
                       value="<?php echo esc_attr($api_key); ?>" 
                       class="regular-text"
                       style="background: #f0f0f1;"
                />

                <p>
                    <button type="button" 
                            class="button button-secondary" 
                            onclick="if(confirm('Are you sure you want to generate a new API key? This will invalidate the current key.')) { 
                                document.getElementById('regenerate_key').submit(); 
                            }">
                        Regenerate API Key
                    </button>
                </p>

                <form id="regenerate_key" method="post" action="options.php">
                    <?php settings_fields('device_tester_settings'); ?>
                    <input type="hidden" name="<?php echo esc_attr($this->api_key_option); ?>" value="<?php echo esc_attr($this->generate_api_key()); ?>" />
                </form>
            </div>
        </div>
        <?php
    }

    public function validate_tester_url($url) {
        if (empty($url)) {
            add_settings_error(
                'device_tester_url',
                'empty_url',
                'Device Tester URL cannot be empty'
            );
            return '';
        }

        $url = esc_url_raw($url);
        if (!filter_var($url, FILTER_VALIDATE_URL)) {
            add_settings_error(
                'device_tester_url',
                'invalid_url',
                'Please enter a valid URL'
            );
            return '';
        }

        return $url;
    }
    public function register_settings() {
        register_setting('device_tester_settings', 'device_tester_url', array($this, 'validate_tester_url'));
        register_setting('device_tester_settings', $this->api_key_option);
        register_setting('device_tester_settings', $this->connection_status_option);
        register_setting('device_tester_settings', 'device_tester_excluded_types');
    }


    public function apply_css_changes($page_id, $css_content, $device_type) {
        global $wpdb;

        // Insert the change record
        $wpdb->insert(
            $wpdb->prefix . 'device_tester_css_changes',
            array(
                'page_id' => $page_id,
                'css_content' => $css_content,
                'applied_by' => get_current_user_id(),
                'device_type' => $device_type
            ),
            array('%d', '%s', '%d', '%s')
        );

        // Get the change ID
        $change_id = $wpdb->insert_id;

        // Apply the CSS
        $this->inject_custom_css($page_id, $css_content, $device_type);

        return $change_id;
    }

    public function revert_css_changes($change_id) {
        global $wpdb;

        // Get the change record
        $change = $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM {$wpdb->prefix}device_tester_css_changes WHERE id = %d",
            $change_id
        ));

        if (!$change) {
            return false;
        }

        // Update the change status
        $wpdb->update(
            $wpdb->prefix . 'device_tester_css_changes',
            array(
                'status' => 'reverted',
                'reverted_at' => current_time('mysql'),
                'reverted_by' => get_current_user_id()
            ),
            array('id' => $change_id),
            array('%s', '%s', '%d'),
            array('%d')
        );

        // Remove the CSS
        $this->remove_custom_css($change->page_id, $change->device_type);

        return true;
    }

    private function inject_custom_css($page_id, $css_content, $device_type) {
        // Get or create the custom CSS file
        $upload_dir = wp_upload_dir();
        $css_dir = $upload_dir['basedir'] . '/device-tester-css';

        if (!file_exists($css_dir)) {
            wp_mkdir_p($css_dir);
        }

        $filename = sprintf('page-%d-%s.css', $page_id, sanitize_title($device_type));
        $filepath = $css_dir . '/' . $filename;

        // Write CSS to file
        file_put_contents($filepath, $css_content);

        // Add to WordPress
        add_action('wp_head', function() use ($upload_dir, $filename, $device_type) {
            printf(
                '<link rel="stylesheet" href="%s" media="(max-width: %dpx)">',
                esc_url($upload_dir['baseurl'] . '/device-tester-css/' . $filename),
                $this->get_device_max_width($device_type)
            );
        });
    }

    private function remove_custom_css($page_id, $device_type) {
        $upload_dir = wp_upload_dir();
        $filename = sprintf('page-%d-%s.css', $page_id, sanitize_title($device_type));
        $filepath = $upload_dir['basedir'] . '/device-tester-css/' . $filename;

        if (file_exists($filepath)) {
            unlink($filepath);
        }
    }

    private function get_device_max_width($device_type) {
        // Add device-specific max-widths
        $widths = array(
            'mobile' => 767,
            'tablet' => 1024,
            'desktop' => 1920
        );

        return $widths[$device_type] ?? 1920;
    }

    public function handle_css_apply($request) {
        $page_id = $request->get_param('page_id');
        $css_content = $request->get_param('css_content');
        $device_type = $request->get_param('device_type');

        $change_id = $this->apply_css_changes($page_id, $css_content, $device_type);

        if ($change_id) {
            return array(
                'success' => true,
                'change_id' => $change_id
            );
        }

        return new WP_Error('css_apply_failed', 'Failed to apply CSS changes');
    }

    public function handle_css_revert($request) {
        $change_id = $request->get_param('id');

        $success = $this->revert_css_changes($change_id);

        if ($success) {
            return array('success' => true);
        }

        return new WP_Error('css_revert_failed', 'Failed to revert CSS changes');
    }
}

// Initialize plugin
new DeviceTester();