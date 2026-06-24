(() => {
  'use strict';

  const oldSetTab = window.setTab;
  const oldSetOwnerTab = window.setOwnerTab;
  const oldRenderOwner = window.renderOwner;

  function cardById(id) {
    return document.getElementById(id)?.closest('.card') || null;
  }

  function labelCard(id, title, subtitle) {
    const card = cardById(id);
    if (!card) return;
    const titleNode = card.querySelector('.card-title');
    const subtitleNode = card.querySelector('.card-sub');
    if (title && titleNode) titleNode.textContent = title;
    if (subtitle && subtitleNode) subtitleNode.textContent = subtitle;
  }

  function applyLabels() {
    const live = document.querySelector('.live');
    if (live) live.textContent = 'LIVE · SHEETS + HUBSPOT';

    if ($('pageSub') && CURRENT_TAB === 'dashboard') {
      $('pageSub').textContent = 'Renewal & financial truth from Google Sheets · activity & follow-ups from HubSpot';
    }

    const financialHeading = Array.from(document.querySelectorAll('.section-title h3')).find(node => node.textContent.includes('Financial Snapshot'));
    if (financialHeading) {
      financialHeading.textContent = 'Renewal & Financial Snapshot · Google Sheets';
      const text = financialHeading.parentElement?.querySelector('p');
      if (text) text.textContent = 'Budget, delayed, renewed, booking and collection use Google Sheets only.';
    }

    labelCard('activityKpis', 'Activity Performance', 'Connected calls and completed meetings · HubSpot only');
    labelCard('opsActionList', 'Priority Actions', 'HubSpot activity, meeting and cadence alerts');
    labelCard('repPerformanceBody', 'Rep Performance', 'HubSpot companies, calls, meetings, no activity and tier follow-ups');
    labelCard('renewalPipelineList', 'Renewal Plan by Month', 'Google Sheets budget, booking and collection statuses');
    labelCard('delayedOpsList', 'Delayed Renewals', 'Google Sheets renewal month passed with no booking or collection');
    labelCard('accountHealthBody', 'Account Health Ledger', 'HubSpot companies: owners, tiers, activity and follow-up status');
    labelCard('smartActionsList', 'Smart Actions', 'Google Sheets financial actions + HubSpot operational actions');

    const activityBadge = cardById('activityKpis')?.querySelector('.pill');
    if (activityBadge) activityBadge.textContent = 'HubSpot';

    const priorityButton = cardById('opsActionList')?.querySelector('button');
    if (priorityButton) priorityButton.onclick = () => openRows('All HubSpot Follow-ups', hubspotActionRows(), 'ops');

    const repHeaders = cardById('repPerformanceBody')?.querySelectorAll('th');
    if (repHeaders?.[5]) repHeaders[5].textContent = 'No Activity';

    const renewalButton = cardById('renewalPipelineList')?.querySelector('button');
    if (renewalButton) renewalButton.onclick = () => openRows('Renewal Plan', sheetRenewalRows(), 'sheet');

    const delayedButton = cardById('delayedOpsList')?.querySelector('.more');
    if (delayedButton) delayedButton.onclick = () => openRows('Delayed Renewals', metricRows('delayed', filteredAccounts()), 'sheet');

    const healthHeaders = cardById('accountHealthBody')?.querySelectorAll('th');
    if (healthHeaders?.[7]) healthHeaders[7].textContent = 'Follow-up';

    document.querySelectorAll('.owner-panel').forEach(panel => {
      const operational = panel.querySelector('[id^="ownerOpsList-"]')?.closest('.card');
      const health = panel.querySelector('[id^="ownerHealth-"]')?.closest('.card');
      const operationalSub = operational?.querySelector('.card-sub');
      const healthSub = health?.querySelector('.card-sub');
      if (operationalSub) operationalSub.textContent = 'HubSpot tier follow-ups, no activity and no meeting alerts';
      if (healthSub) healthSub.textContent = 'HubSpot assigned companies and activity gaps';
    });

    if (!document.getElementById('sourcePolicyBanner')) {
      const banner = document.createElement('div');
      banner.id = 'sourcePolicyBanner';
      banner.className = 'source-policy-banner';
      banner.textContent = 'Google Sheets: renewal, delayed, renewed, booking and cash · HubSpot: accounts, calls, meetings and follow-ups · HubSpot deals hidden';
      document.querySelector('.filters')?.insertAdjacentElement('afterend', banner);
    }
  }

  if (typeof oldSetTab === 'function') {
    window.setTab = tab => {
      oldSetTab(tab);
      $('pageSub').textContent = tab === 'financial'
        ? 'Google Sheets · Budget + Booking + Collection'
        : 'Renewal & financial truth from Google Sheets · activity & follow-ups from HubSpot';
      applyLabels();
    };
  }

  if (typeof oldSetOwnerTab === 'function') {
    window.setOwnerTab = owner => {
      oldSetOwnerTab(owner);
      $('pageSub').textContent = 'Google Sheets financial performance · HubSpot operational performance';
      applyLabels();
    };
  }

  if (typeof oldRenderOwner === 'function') {
    window.renderOwner = owner => {
      oldRenderOwner(owner);
      const labels = document.querySelectorAll(`#profileStats-${safeId(owner)} span`);
      if (labels[0]) labels[0].textContent = 'Renewal Rows';
      applyLabels();
    };
  }

  applyLabels();
  if (RAW) render();
})();
