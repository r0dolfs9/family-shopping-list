// Node runner: `npm test`
import test from 'node:test';
import assert from 'node:assert/strict';
import { registerSpecs } from './specs.js';

registerSpecs({ test, assert });
