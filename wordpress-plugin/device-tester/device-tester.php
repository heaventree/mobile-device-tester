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

    public function __construct() {
        global $wpdb;
        $this->table_name = $wpdb->prefix . 'device_tester_stats';
        $this->plugin_url = trim(get_option('device_tester_url'), '/');

        // Initialize plugin
        register_activation_hook(__FILE__, array($this, 'install'));
        add_action('admin_init', array($this, 'maybe_upgrade'));

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

        $sql = "CREATE TABLE IF NOT EXISTS $this->table_name (
            id mediumint(9) NOT NULL AUTO_INCREMENT,
            page_id bigint(20) NOT NULL,
            test_date datetime DEFAULT CURRENT_TIMESTAMP,
            device_type varchar(50) NOT NULL,
            PRIMARY KEY  (id),
            KEY page_id (page_id)
        ) $charset_collate;";

        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        dbDelta($sql);

        add_option('device_tester_db_version', $this->db_version);

        // Add default excluded post types
        add_option('device_tester_excluded_types', array('attachment', 'revision', 'nav_menu_item'));
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
        </style>
        <?php
    }

    public function add_admin_menu() {
        add_options_page(
            'Device Tester Settings',
            'Device Tester',
            'manage_options',
            'device-tester',
            array($this, 'render_settings_page')
        );
    }

    public function register_settings() {
        register_setting('device_tester_settings', 'device_tester_url', array(
            'sanitize_callback' => array($this, 'validate_tester_url')
        ));
        register_setting('device_tester_settings', 'device_tester_excluded_types');
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
}

// Initialize plugin
new DeviceTester();