/* Informational matching only. Sources reviewed 25 November 2026.
   Every grant carries its official source and the remaining checks. No answers
   are transmitted, put in URLs, or written to browser storage. */
(() => {
  'use strict';
  const sources = {
    hcg: 'https://www.aic.sg/financial-assistance/home-caregiving-grant',
    ctg: 'https://www.aic.sg/financial-assistance/caregivers-training-grant',
    smf: 'https://www.aic.sg/Financial-Assistance/Seniors-Mobility-and-Enabling-Fund---Mobility-and-Assistive-Devices',
    comcare: 'https://ask.gov.sg/msf/questions/cm7iuqdlc015s5tbnxtv2rpcz',
    southwest: 'https://southwest.cdc.gov.sg/what-we-do/for-caregivers/south-west-caregiver-support-fund/'
  };
  const adlKeys = ['washing', 'dressing', 'feeding', 'toileting', 'mobility', 'transferring'];
  function summariseADLs(values = {}) {
    const all = adlKeys.map(key => values[key]);
    return {
      help: all.filter(value => value === 'some' || value === 'full').length,
      independent: all.filter(value => value === 'independent').length,
      unknown: all.filter(value => !['some', 'full', 'independent'].includes(value)).length
    };
  }
  const knownAge = value => Number.isInteger(value) && value >= 0 && value <= 120;
  const atLeast = (adl, count) => adl.help >= count ? true : adl.help + adl.unknown < count ? false : null;
  const together = values => values.includes(false) ? false : values.every(value => value === true) ? true : null;
  const either = values => values.includes(true) ? true : values.every(value => value === false) ? false : null;
  const test = (value, explanation) => ({ value, explanation });
  function recommend(profile) {
    const p = profile || {}, adl = summariseADLs(p.adls), needs = new Set(p.needs || []);
    const national = p.citizenship === 'sc' || p.citizenship === 'pr' ? true : p.citizenship === 'other' ? false : null;
    const hcgNational = p.citizenship === 'sc' ? true : p.citizenship === 'pr' ? (p.family === 'yes' ? true : p.family === 'no' ? false : null) : national;
    const permanent = p.duration === 'assessed' ? true : p.duration === 'temporary' ? false : null;
    let means = null;
    if (['low', 'middle', 'upper'].includes(p.income)) means = true;
    else if (p.income === 'above') means = false;
    else if (p.income === 'none' && typeof p.property === 'number' && Number.isFinite(p.property) && p.property >= 0) {
      // AIC's criteria and payout tables word the S$21,000 boundary differently.
      // Leave the exact boundary for the provider rather than making a decision.
      means = p.property === 21000 ? null : p.property < 21000;
    }
    const active = p.role === 'preparing' ? null : true;
    const hcgHome = p.residence === 'home' ? true : ['nursing', 'residential', 'outside'].includes(p.residence) ? false : null;
    const smfHome = p.residence === 'home' ? true : ['nursing', 'outside'].includes(p.residence) ? false : null;
    const age60 = knownAge(p.recipientAge) ? p.recipientAge >= 60 : null;
    const age65 = knownAge(p.recipientAge) ? p.recipientAge >= 65 : null;
    const disabilityRoute = either([together([atLeast(adl, 1), permanent]), p.disability === 'no' ? false : null]);
    function scheme(id, title, why, checks, next) {
      const result = together(checks.map(check => check.value));
      return { id, title, why, status: result === true ? 'possible' : result === false ? 'different' : 'review', checks: checks.filter(check => check.value !== true).map(check => check.explanation), next, url: sources[id] };
    }
    const schemes = [
      scheme('hcg', 'Home Caregiving Grant (HCG)', adl.help >= 3 ? 'You reported help with at least three daily activities.' : 'For families providing ongoing personal care at home.', [
        test(hcgNational, 'The care recipient must be a Singapore Citizen, or a PR with a living Singapore Citizen parent, child or spouse.'),
        test(hcgHome, 'HCG is for care recipients living in Singapore outside residential long-term care.'),
        test(atLeast(adl, 3), 'The care recipient must need help with at least three of the six ADLs.'),
        test(permanent, 'A professional assessment must confirm permanent help needs.'),
        test(means, 'AIC checks household income per person up to S$4,800, or the home’s annual value for a household with no income. Confirm the S$21,000 annual-value boundary with AIC.'),
        test(active, 'If you are preparing to care, ask about applying when the assessed care needs arise.')
      ], 'Ask AIC or P3H about the required care assessment and formal means-test.'),
      scheme('ctg', 'Caregivers Training Grant (CTG)', 'Helps caregivers attend approved courses to build practical skills.', [
        test(national, 'The care recipient must be a Singapore Citizen or Permanent Resident.'),
        test(either([age65, disabilityRoute]), 'The care recipient must be 65 or older, or meet AIC’s disability or qualifying-scheme criteria. Ask about the assessment route if younger.'),
        test(p.role === 'self' || p.role === 'preparing' ? null : true, 'Check who will be the main caregiver attending training, including if you are arranging care for yourself.')
      ], 'Check the grant balance, approved course and main-caregiver requirements with the training provider before enrolling.'),
      scheme('smf', 'Seniors’ Mobility and Enabling Fund (SMF)', 'Supports assessed needs for mobility and assistive devices.', [
        test(national, 'The care recipient must be a Singapore Citizen or Permanent Resident.'),
        test(age60, 'The care recipient must be at least 60 for this SMF device scheme.'),
        test(smfHome, 'The care recipient must not be living in a nursing home or MSF home. Check other living arrangements with AIC.'),
        test(means, 'AIC checks household income per person up to S$4,800, or the home’s annual value for a household with no income. Confirm the S$21,000 annual-value boundary with AIC.'),
        test(needs.has('equipment') ? true : null, 'An approved professional must establish a need for the specific device.')
      ], 'Get an assessment and approval before buying equipment. Device-specific conditions also apply.')
    ];
    const resources = [];
    const resource = (id, title, why, next, url, status = 'resource') => resources.push({ id, title, why, next, url, status, checks: [] });
    resource('journey', p.role === 'preparing' ? 'Preparing for caregiving' : 'Caregiving guidance', p.role === 'preparing' ? 'You are planning ahead for a possible caring role.' : 'Find practical guidance for your stage of care.', 'Start with the guide and note the questions you want to discuss with P3H.', p.role === 'preparing' ? 'caregiving-journey.html#preparing' : 'caregiving-journey.html#caring-now');
    if (p.role !== 'self' && knownAge(p.caregiverAge) && p.caregiverAge < 21) resource('young', 'Guidance for young caregivers', 'Your own study, work, friendships and wellbeing matter too.', 'Explore age-appropriate guidance and ask a trusted adult or the P3H team for support.', 'caregiving-journey.html#young-caregivers');
    if (p.difficulty === 'yes' || needs.has('money') || ['low', 'none'].includes(p.income) || ['looking', 'temporary', 'permanent'].includes(p.work)) {
      resource('comcare', 'ComCare and Social Service Office support', 'Your answers suggest checking help with household costs.', 'Ask an SSO to assess your whole household situation. Income benchmarks are not an automatic exclusion.', sources.comcare, 'review');
    }
    if (p.district === 'southwest' && (needs.has('money') || p.difficulty === 'yes' || !needs.size)) {
      resource('southwest', 'South West Caregiver Support Fund', 'You live in South West District and may want help with caregiving costs.', 'Ask the CDC to check living together, citizenship, income or Blue CHAS status, and ADL or certified-disability evidence.', sources.southwest, 'review');
    }
    if (needs.has('respite')) resource('respite', 'Self-care and respite support', 'You would like a break from caregiving.', 'Discuss suitable respite and current availability with P3H.', 'assistance.html#support-3');
    if (needs.has('community')) resource('community', 'Peer support and counselling referrals', 'You asked for emotional or peer support.', 'Ask P3H about available peer groups and professional counselling referrals.', 'assistance.html#support-4');
    if (needs.has('training') || p.role === 'preparing') resource('training', 'Caregiver training and planning', 'Practical skills can help you prepare for daily care.', 'Explore training options even if CTG needs further checking.', 'assistance.html#training-programmes');
    if (needs.has('disability') || p.disability === 'yes') resource('disability', 'Enabling Guide', 'You asked about disability support or reported a certified disability.', 'Explore disability services and caregiver resources through SG Enable’s Enabling Guide.', 'https://www.enablingguide.sg/');
    resource('directory', 'Caregiver resource directory', 'Explore more services if these schemes do not fit your situation.', 'Search by topic and ask the P3H team which services may suit you.', 'caregiver-resources.html');
    return { adl, schemes, resources };
  }
  window.P3HEligibility = { recommend, summariseADLs, sources };
  const form = document.querySelector('#eligibility-form');
  if (!form) return;
  const byId = id => document.getElementById(id);
  const t = source => window.P3HI18n ? window.P3HI18n.translate(source) : source;
  const format = (source, values) => Object.entries(values).reduce((text, [key, value]) => text.replaceAll(`{${key}}`, value), t(source));
  let lastProfile = null;
  const number = id => byId(id).value.trim() === '' ? null : Number(byId(id).value);
  function readProfile() {
    const role = byId('care-role').value;
    return { role, caregiverAge: number('caregiver-age'), recipientAge: number('recipient-age') ?? (role === 'self' ? number('caregiver-age') : null), citizenship: byId('recipient-citizenship').value, family: byId('recipient-family').value, residence: byId('recipient-residence').value, duration: byId('recipient-duration').value, disability: byId('recipient-disability').value, income: byId('household-income').value, property: byId('household-income').value === 'none' ? number('property-value') : null, difficulty: byId('financial-difficulty').value, district: byId('caregiver-district').value, work: byId('caregiver-work').value, needs: [...form.querySelectorAll('[data-need]:checked')].map(input => input.value), adls: Object.fromEntries(adlKeys.map(key => [key, byId(`adl-${key}`).value])) };
  }
  function updateFields() {
    byId('family-row').hidden = byId('recipient-citizenship').value !== 'pr';
    byId('property-row').hidden = byId('household-income').value !== 'none';
    byId('property-value').disabled = byId('household-income').value !== 'none';
    const adl = summariseADLs(readProfile().adls);
    byId('adl-summary').textContent = format('Needs help with {help} of 6 activities; {unknown} not sure.', adl);
  }
  const node = (tag, text, className) => {
    const el = document.createElement(tag);
    if (text !== undefined) el.textContent = text;
    if (className) el.className = className;
    return el;
  };
  function table(items, caption) {
    const table = node('table', undefined, 'eligibility-table match-table'); table.setAttribute('role', 'table');
    table.append(node('caption', t(caption)));
    const colgroup = node('colgroup'); for (let i = 0; i < 3; i++) colgroup.append(node('col')); table.append(colgroup);
    const head = node('thead'), header = node('tr');
    const columns = ['Grant or resource', 'Why it may help / what to check', 'Next step'];
    columns.forEach(label => { const th = node('th', t(label)); th.scope = 'col'; header.append(th); }); head.append(header); table.append(head);
    const body = node('tbody');
    for (const item of items) {
      const row = node('tr'); row.dataset.optionId = item.id; row.dataset.matchStatus = item.status;
      const title = node('th'); title.scope = 'row'; title.append(node('span', t(item.title)));
      const badge = node('span', t({ possible: 'Worth exploring', review: 'Check details with the provider', different: 'Some criteria do not match', resource: 'Useful resource' }[item.status]), `match-status ${item.status === 'review' ? 'review' : ''}`);
      title.append(node('br'), badge); row.append(title);
      const why = node('td'); why.dataset.label = t(columns[1]); why.append(node('p', t(item.why)));
      item.checks.forEach(check => why.append(node('p', t(check)))); row.append(why);
      const next = node('td'); next.dataset.label = t(columns[2]); next.append(node('p', t(item.next)));
      const anchor = node('a', t(item.url.startsWith('https:') ? 'View official details' : 'Explore this support')); anchor.href = item.url;
      if (!item.url.startsWith('https:')) {
        const url = new URL(item.url, location.href); url.searchParams.set('lang', window.P3HI18n?.language || 'en'); anchor.href = url.href;
      }
      anchor.target = '_blank'; anchor.rel = 'noopener noreferrer'; next.append(anchor); row.append(next); body.append(row);
    }
    table.append(body); return table;
  }
  function renderResults() {
    if (!lastProfile) return;
    const result = recommend(lastProfile);
    const suggestions = [...result.schemes.filter(item => item.status !== 'different'), ...result.resources];
    const other = result.schemes.filter(item => item.status === 'different');
    byId('matched-options').replaceChildren(table(suggestions, 'Suggested grants and resources'));
    byId('other-options-list').replaceChildren();
    byId('other-options').hidden = !other.length;
    if (other.length) byId('other-options-list').append(table(other, 'Schemes with additional criteria to discuss'));
    byId('results-summary').textContent = t('These suggestions reflect your answers, not a formal eligibility decision. Unknown answers need checking; other support may still be available.');
    byId('eligibility-results').hidden = false;
  }
  function markChanged() {
    updateFields();
    if (lastProfile) { lastProfile = null; byId('eligibility-results').hidden = true; byId('eligibility-changed').textContent = t('Your answers changed. Select Show my options to update your suggestions.'); }
  }
  form.addEventListener('input', markChanged);
  form.addEventListener('change', markChanged);
  form.addEventListener('submit', event => {
    event.preventDefault(); if (!form.reportValidity()) return;
    lastProfile = readProfile(); renderResults(); byId('eligibility-changed').textContent = ''; byId('other-options').open = false;
    byId('results-heading').focus();
  });
  form.addEventListener('reset', () => {
    lastProfile = null; byId('eligibility-results').hidden = true; byId('eligibility-changed').textContent = '';
    byId('matched-options').replaceChildren(); byId('other-options-list').replaceChildren();
    setTimeout(updateFields, 0);
  });
  byId('adl-independent').addEventListener('click', () => { form.querySelectorAll('[data-adl]').forEach(select => { select.value = 'independent'; }); markChanged(); });
  byId('print-options').addEventListener('click', () => window.print());
  document.addEventListener('p3h:languagechange', () => { updateFields(); renderResults(); if (byId('eligibility-changed').textContent) byId('eligibility-changed').textContent = t('Your answers changed. Select Show my options to update your suggestions.'); });
  updateFields(); byId('find-options').disabled = false;
})();
