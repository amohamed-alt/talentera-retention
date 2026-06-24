(() => {
  'use strict';

  window.RETENTION_FEATURE_FLAGS = Object.freeze({
    financialSource: 'Google Sheets',
    operationalSource: 'HubSpot',
    showHubSpotDeals: false,
  });

  const originalOpenRows = window.openRows;
  const uniqueRows = rows => {
    const seen = new Set();
    return (rows || []).filter(row => {
      const key = [row.companyId,row.id,row.gid,row.clientName,row.companyName,row.name,row.alert,row.role,row.product].filter(Boolean).join('|');
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };
  const sheetRows = () => filteredAccounts();
  const sheetDelayed = () => metricRows('delayed', sheetRows());
  const hsRows = kind => opRows(kind);

  window.hubspotActionRows = () => uniqueRows([
    ...hsRows('tierFollowups'),
    ...hsRows('noActivity'),
    ...hsRows('noMeeting'),
    ...tierRowsFor('NO_TIER', hsRows('retentionAccounts')),
  ]);
  window.sheetRenewalRows = () => sheetRows().filter(row => row.renewalMonth);

  function mixedCard(title, value, sub, rows, key, type, dark, color) {
    window.__rows = window.__rows || {};
    window.__rows[key] = rows || [];
    return `<div class="card stat ${dark ? 'dark' : ''}" onclick="openRows('${esc(title)}', window.__rows['${key}'], '${type}')"><h3>${esc(title)}</h3><div class="go">↗</div><div class="val">${esc(value)}</div><div class="sub"><span class="pill ${color}">${rows.length.toLocaleString()} rows</span>${esc(sub)}</div></div>`;
  }

  window.renderOverviewStats = () => {
    const active = hsRows('activeAccounts');
    const delayed = sheetDelayed();
    const tier = hsRows('tierFollowups');
    const noActivity = hsRows('noActivity');
    $('mainStats').innerHTML = [
      mixedCard('Active Accounts', String(active.length), 'HubSpot retention companies', active, 'activeAccounts', 'ops', true, 'green'),
      mixedCard('Delayed Renewals', String(delayed.length), `${money(sum(delayed,'renewalValue2026'))} · Google Sheets`, delayed, 'delayedSheetRows', 'sheet', false, 'red'),
      mixedCard('Tier Follow-ups', String(tier.length), 'HubSpot RM / CSM cadence', tier, 'tierOps', 'ops', false, 'purple'),
      mixedCard('No Activity 30D', String(noActivity.length), 'HubSpot accounts needing touch', noActivity, 'noActivityOps', 'ops', false, 'amber'),
    ].join('');
  };

  window.renderActivityKpis = () => {
    const k = RAW?.kpis || RAW?.kpi || {};
    const periods = [['Yesterday',k.yesterday||k.yest||{}],['MTD',k.mtd||{}],['YTD',k.ytd||{}]];
    $('activityKpis').innerHTML = periods.map(([label,m]) => {
      const key = `activity_${label}`;
      window.__rows[key] = [...hsRows('calls'), ...hsRows('meetings')];
      return `<div class="ops-kpi" onclick="openRows('${label} HubSpot Activity', window.__rows['${key}'], 'ops')"><span>${label}</span><b>${num(m.calls).toLocaleString()} / ${num(m.meetings).toLocaleString()}</b><small>Connected calls / completed meetings · HubSpot</small></div>`;
    }).join('');
  };

  window.renderOperationalActions = () => {
    const tier = hsRows('tierFollowups');
    const noActivity = hsRows('noActivity');
    const noMeeting = hsRows('noMeeting');
    const noTier = tierRowsFor('NO_TIER', hsRows('retentionAccounts'));
    $('opsActionList').innerHTML = [
      opsActionItem('Tier Follow-ups Due','HubSpot A/B/C cadence follow-up','●',tier,'purple'),
      opsActionItem('No Activity 30D','No connected call or completed meeting','↺',noActivity,'amber'),
      opsActionItem('No Meeting 90D','No completed meeting recently','☉',noMeeting,'blue'),
      opsActionItem('Missing Tier','Add company_tier in HubSpot','!',noTier,'teal'),
    ].join('');
  };

  window.smartActionRows = () => uniqueRows([
    ...metricRows('delayed',sheetRows()),
    ...metricRows('remaining',sheetRows()),
    ...metricRows('noaction',sheetRows()),
    ...window.hubspotActionRows(),
  ]);

  window.renderRepPerformance = () => {
    const rows = repRows();
    $('repPerfBadge').textContent = `${rows.length} reps · HubSpot`;
    $('repPerformanceBody').innerHTML = rows.map(row => {
      const d = ownerDetailByName(row.name);
      const m = d?.metrics || row;
      const noActivity = d?.noContactAccounts?.length || 0;
      return `<tr onclick="setOwnerTab('${esc(row.name)}')"><td><div class="owner-row"><div class="avatar" style="background:${esc(row.color||ownerColor(row.name,row.role))}">${esc(shortOwner(row.name)[0])}</div><div><b>${esc(shortOwner(row.name))}</b><span>${esc(row.name)}</span></div></div></td><td class="center"><span class="pill ${row.role==='RM'?'teal':'purple'}">${esc(row.role)}</span></td><td class="center">${num(m.accounts)}</td><td class="center">${num(m.calls)}</td><td class="center">${num(m.meetings)}</td><td class="center"><span class="pill ${noActivity?'red':'green'}">${noActivity}</span></td><td class="center"><span class="pill ${num(m.tierFollowupDue)?'amber':'green'}">${num(m.tierFollowupDue)}</span></td></tr>`;
    }).join('');
  };

  window.renderRenewalPipelineOps = () => {
    const rows = sheetRows();
    const months = MONTHS.map((month,index) => {
      const list = rows.filter(row => row.renewalMonth === month);
      return {month,label:`2026-${String(index+1).padStart(2,'0')}`,list,due:list.length,renewed:list.filter(r=>r.status==='Renewed On Time'||r.status==='Renewed Late').length,delayed:list.filter(r=>r.status==='Delayed').length,upcoming:list.filter(r=>r.status==='Upcoming').length};
    });
    const max = Math.max(1,...months.map(row=>row.due));
    $('renewalPipelineList').innerHTML = months.map(row => {
      const key = `sheet_month_${row.month}`;
      window.__rows[key] = row.list;
      return `<div class="month-row" onclick="openRows('${row.label} Renewal Plan', window.__rows['${key}'], 'sheet')"><b>${row.label}</b><div><div class="line"><span style="width:${Math.max(4,row.due/max*100)}%"></span></div><small>${row.renewed} renewed · ${row.delayed} delayed · ${row.upcoming} upcoming</small></div><span class="pill ${row.delayed?'red':'green'}">${row.due} rows</span></div>`;
    }).join('');
  };

  window.renderDelayedOps = () => {
    const delayed = sheetDelayed().sort((a,b)=>num(a.renewalMonthIndex||99)-num(b.renewalMonthIndex||99)||num(b.renewalValue2026)-num(a.renewalValue2026));
    $('delayedOpsBadge').textContent = `${delayed.length} · ${money(sum(delayed,'renewalValue2026'))}`;
    $('delayedOpsList').innerHTML = smallRows(delayed,'renewalValue2026',8);
  };

  window.renderAccountHealthLedger = () => {
    const rows = hsRows('retentionAccounts');
    $('accountHealthBadge').textContent = `${rows.length} HubSpot accounts`;
    $('accountHealthBody').innerHTML = rows.slice(0,180).map((row,index) => {
      const key = `health_${index}_${String(row.companyId||row.companyName).replace(/\W+/g,'_')}`;
      const due = [row.rmFollowupDue?'RM':'',row.csmFollowupDue?'CSM':''].filter(Boolean);
      window.__rows[key] = [row];
      return `<tr onclick="openRows('${esc(row.companyName||'Account')}', window.__rows['${key}'], 'ops')"><td><b>${esc(row.companyName||'Unnamed')}</b><br><span class="muted">${esc(row.companyId||'')}</span></td><td>${esc(shortOwner(row.rmOwnerName)||'—')}</td><td>${esc(shortOwner(row.csmOwnerName)||'—')}</td><td class="center"><span class="pill ${row.companyTier==='A'?'red':row.companyTier==='B'?'amber':row.companyTier==='C'?'green':'teal'}">${esc(row.companyTier?'Tier '+row.companyTier:'Missing')}</span></td><td class="center">${esc(row.accountStatus||'—')}</td><td class="center">${esc(row.lastActivityDate||'—')}</td><td class="center">${esc(row.lastMeetingDate||'—')}</td><td class="center"><span class="pill ${due.length?'red':'green'}">${esc(due.length?due.join(' + ')+' due':'Clear')}</span></td></tr>`;
    }).join('');
  };

  window.renderOwnerOperational = owner => {
    const id = safeId(owner);
    const d = ownerDetailByName(owner);
    if (!d) return;
    const m = d.metrics || {};
    const items = [
      ['HubSpot Accounts',num(m.accounts),d.accounts||[]],
      ['Calls',num(m.calls),d.calls||[]],
      ['Meetings',num(m.meetings),d.meetings||[]],
      ['Tier Due',num(m.tierFollowupDue),d.tierFollowups||[]],
      ['No Activity',(d.noContactAccounts||[]).length,d.noContactAccounts||[]],
    ];
    $(`ownerOpsStats-${id}`).innerHTML = items.map(([title,value,rows],index) => {
      const key = `ownerop_${id}_${index}`;
      window.__rows[key] = rows;
      return `<div class="owner-mini" onclick="openRows('${esc(shortOwner(owner))} ${esc(title)}', window.__rows['${key}'], 'ops')"><b>${value.toLocaleString()}</b><span>${esc(title)}</span></div>`;
    }).join('');
    const followups = uniqueRows([...(d.tierFollowups||[]),...(d.noContactAccounts||[]),...(d.noMeetingAccounts||[])]);
    $(`ownerOpsBadge-${id}`).textContent = followups.length;
    $(`ownerOpsList-${id}`).innerHTML = opsSmallRows(followups,'daysSinceActivity',8);
    $(`ownerHealthBadge-${id}`).textContent = (d.accounts||[]).length;
    $(`ownerHealth-${id}`).innerHTML = opsSmallRows(d.accounts||[],'daysSinceActivity',8);
  };

  window.openRows = (title,rows,type='sheet') => {
    if (type !== 'ops') return originalOpenRows(title,rows,type);
    const list = Array.isArray(rows) ? rows.filter(Boolean) : [];
    $('modalTitle').textContent = `${title} (${list.length.toLocaleString()})`;
    $('modalSub').textContent = 'HubSpot operational rows only. Deal metrics are hidden until approved.';
    $('modalBody').innerHTML = list.length ? '<div class="modal-grid head"><div>Account / Activity</div><div>Owners</div><div>Status / Tier</div><div>Activity</div><div>Source</div><div>Follow-up</div></div>' + list.map(row => {
      const name = row.companyName||row.clientName||row.name||row.title||'Unnamed account';
      const owners = [row.ownerName&&'Owner: '+row.ownerName,row.rmOwnerName&&'RM: '+row.rmOwnerName,row.csmOwnerName&&'CSM: '+row.csmOwnerName,row.role&&'Role: '+row.role].filter(Boolean).join('<br>')||'—';
      const status = row.alert||row.accountStatus||row.status||row.type||'Operational';
      const tier = row.tierLabel||(row.companyTier?'Tier '+row.companyTier:'');
      const activity = [row.lastActivityDate&&'Last activity '+row.lastActivityDate,row.lastMeetingDate&&'Meeting '+row.lastMeetingDate,row.date&&'Activity '+row.date,row.daysSinceActivity&&'No activity '+row.daysSinceActivity+'d',row.daysSinceMeeting&&'No meeting '+row.daysSinceMeeting+'d'].filter(Boolean).join('<br>')||'—';
      const followup = [row.rmFollowupDue&&'RM follow-up due',row.csmFollowupDue&&'CSM follow-up due',row.requiredDays&&'Cadence '+row.requiredDays+'d',row.calls!==undefined&&'Calls '+num(row.calls),row.meetings!==undefined&&'Meetings '+num(row.meetings)].filter(Boolean).join('<br>')||'—';
      const link = row.companyUrl||'';
      return `<div class="modal-grid"><div><b>${link?`<a href="${esc(link)}" target="_blank" rel="noopener">${esc(name)} ↗</a>`:esc(name)}</b><br><span class="muted">${esc(row.companyId||row.id||'')}</span></div><div>${owners}</div><div><span class="pill ${badgeClass(row)}">${esc(status)}</span><br><span class="muted">${esc(tier)}</span></div><div>${activity}</div><div>HubSpot<br><span class="muted">Retention</span></div><div>${followup}</div></div>`;
    }).join('') : '<div style="padding:30px" class="muted">No rows found.</div>';
    $('modalBg').classList.add('active');
  };
})();
