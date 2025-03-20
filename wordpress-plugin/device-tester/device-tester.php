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

    public function __construct() {
        $this->plugin_url = trim(get_option('device_tester_url'), '/');

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

    public function render_shortcode($atts) {
        if (!$this->plugin_url) {
            return '<!-- Device Tester URL not configured -->';
        }

        $current_url = urlencode(get_permalink());
        $test_url = $this->plugin_url . '?url=' . $current_url;

        return sprintf(
            '<div class="device-tester-embed">
                <iframe src="%s" style="width: 100%%; height: 600px; border: none; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);"></iframe>
            </div>',
            esc_url($test_url)
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
        if (!$this->plugin_url) {
            echo '<p>Please configure the Device Tester URL in settings.</p>';
            return;
        }

        echo '<div class="device-tester-widget">';
        echo '<p>Quick test your pages across different devices:</p>';
        echo '<ul style="margin-left: 1em; list-style: disc;">';

        // Get recent pages
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
                        <h3>Shortcode Usage</h3>
                        <p>Use the following shortcode to embed the device tester in your pages:</p>
                        <code>[device_tester]</code>
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