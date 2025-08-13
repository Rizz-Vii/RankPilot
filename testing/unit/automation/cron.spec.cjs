const { expect } = require('chai');
const { computeNextRun: computeNextRunPublic } = require('../../../dist-placeholder/automation/recipes');

// Note: Fallback CJS shim to avoid ESM ts test config; we'll import TS directly via ts-node when configured.
