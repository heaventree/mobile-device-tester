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

    public function __construct() {
        $this->plugin_url = trim(get_option('device_tester_url'), '/');
        
        // Add admin menu
        add_action('admin_menu', array($this, 'add_admin_menu'));
        
        // Add admin bar menu
        add_action('admin_bar_menu', array($this, 'add_admin_bar_button'), 100);
        
        // Register settings
        add_action('admin_init', array($this, 'register_settings'));
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
        register_setting('device_tester_settings', 'device_tester_url');
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
                    'target' => '_blank'
                )
            ));
        }
    }

    public function render_settings_page() {
        ?>
        <div class="wrap">
            <h2>Device Tester Settings</h2>
            <form method="post" action="options.php">
                <?php settings_fields('device_tester_settings'); ?>
                <table class="form-table">
                    <tr valign="top">
                        <th scope="row">Device Tester URL</th>
                        <td>
                            <input type="url" 
                                   name="device_tester_url" 
                                   value="<?php echo esc_attr(get_option('device_tester_url')); ?>" 
                                   class="regular-text"
                                   placeholder="https://your-device-tester-url.repl.co"
                            />
                            <p class="description">Enter the URL of your device testing platform</p>
                        </td>
                    </tr>
                </table>
                <?php submit_button(); ?>
            </form>
        </div>
        <?php
    }
}

// Initialize plugin
new DeviceTester();
