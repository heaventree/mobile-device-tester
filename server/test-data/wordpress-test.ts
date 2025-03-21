import { randomBytes } from 'crypto';

// Test WordPress environment configuration
export const testWordPressConfig = {
  siteUrl: 'http://test-wordpress.local',
  apiKey: randomBytes(32).toString('hex'),
  pageId: 1
};

// Mock WordPress API responses
export const mockWordPressResponses = {
  siteInfo: {
    name: 'Test WordPress Site',
    url: testWordPressConfig.siteUrl,
    version: '6.4.3',
    status: 'connected'
  },
  cssChange: {
    success: true,
    change_id: 1
  },
  cssRevert: {
    success: true
  }
};
