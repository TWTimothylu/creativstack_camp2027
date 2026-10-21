import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../public/tracking.js', import.meta.url), 'utf8')
  .replace("import {config} from './config.js';", '').replaceAll('export function', 'function');
function setup(id = '123456789012345', storageBlocked = false) {
  const scripts = [], data = new Map();
  const context = vm.createContext({config: {metaPixelId: id}, window: {},
    document: {createElement: () => ({addEventListener: () => {}}), head: {appendChild: s => scripts.push(s)}},
    sessionStorage: {
      getItem: k => { if (storageBlocked) throw Error(); return data.get(k); },
      setItem: (k,v) => { if (storageBlocked) throw Error(); data.set(k,v); }
    }});
  vm.runInContext(source, context);
  return {context, scripts};
}
test('missing ID disables all network setup', () => {
  const {context, scripts} = setup('');
  context.initTracking();
  assert.equal(scripts.length, 0);
  assert.equal(context.window.fbq, undefined);
});
test('initialization records one PageView and disables automatic events', () => {
  const {context, scripts} = setup();
  context.initTracking(); context.initTracking();
  assert.equal(scripts.length, 1);
  assert.equal(context.window.fbq.queue.filter(x => x[2] === 'PageView').length, 1);
  assert.equal(context.window.fbq.queue[0][2], false);
});
test('only confirmed storage emits Lead, deduplicated without personal information', () => {
  const {context} = setup(); context.initTracking();
  for (const result of [{ok:false}, {ok:true}, null]) context.trackRegistrationLead(result, 'request-1');
  const result = {ok:true, registrationId:'W27-1', child:'private child', email:'private@example.com', total:5300};
  context.trackRegistrationLead(result, 'request-1');
  context.trackRegistrationLead(result, 'request-1');
  const leads = context.window.fbq.queue.filter(x => x[2] === 'Lead');
  assert.equal(leads.length, 1);
  assert.equal(JSON.stringify(leads[0][3]), '{}');
  assert.equal(leads[0][4].eventID, 'camp2027-lead-request-1');
  assert.equal(JSON.stringify(leads).includes('private'), false);
});
test('blocked storage or pixel does not break successful registration', () => {
  const {context} = setup(undefined, true); context.initTracking();
  const result = {ok:true, registrationId:'W27-1'};
  context.trackRegistrationLead(result, 'request-1');
  context.trackRegistrationLead(result, 'request-1');
  assert.equal(context.window.fbq.queue.filter(x => x[2] === 'Lead').length, 1);
  context.window.fbq = () => { throw Error('blocked'); };
  assert.doesNotThrow(() => context.trackRegistrationLead(result, 'request-2'));
});
