(() => {
  'use strict';
  if (document.querySelector('.p3h-chat')) return;
  const root = new URL('../', document.currentScript.src);
  const canonicalSources = {
    'streams/stream-1.html': 'assistance.html#support-1',
    'streams/stream-2.html': 'assistance.html#support-2',
    'streams/stream-3.html': 'assistance.html#support-3',
    'streams/stream-4.html': 'assistance.html#support-4',
    'how-we-help.html': 'assistance.html#financial-support',
    'programmes.html': 'assistance.html#training-programmes',
    'target-groups.html': 'assistance.html#who-we-help',
    'faq.html': 'resources.html#faqs',
    'venues.html': 'contact.html#visit',
    'partners.html': 'index.html#about',
    'testimonies.html': 'activities.html'
  };
  const canonicalSource = path => {
    const [page, fragment] = path.split('#');
    const home = canonicalSources[page];
    return home ? fragment ? `${home.split('#')[0]}#${fragment}` : home : path;
  };
  const link = document.createElement('link');
  link.rel = 'stylesheet'; link.href = new URL('css/chatbot.css', root); document.head.append(link);
  const topics = [
    { title: 'What is P3H?', keys: ['p3h', 'about', 'humanistic', 'what is', 'heart'], text: 'P3H means Humanistic Hands and Heart. This Tzu Chi Singapore programme supports youth and adult caregivers with care navigation, training, self-care and respite, and peer support.', source: 'faq.html' },
    { title: 'Who can get support?', keys: ['eligible', 'eligibility', 'qualify', 'youth', 'adult', 'middle', 'who', 'join'], text: 'P3H supports youth and adult caregivers, especially people whose needs fall between subsidised services and private care options. The team can discuss your circumstances, participation requirements and any costs.', source: 'target-groups.html' },
    { title: 'Explore the four support areas', keys: ['support', 'help', 'assistance', 'services', 'streams'], text: 'You can explore four areas: care navigation and financial assistance; caregiver training and planning ahead; self-care and respite; and peer support and resource sharing. You do not need to choose an area before contacting the team.', source: ['streams/stream-1.html', 'streams/stream-2.html', 'streams/stream-3.html', 'streams/stream-4.html'] },
    { title: 'Financial assistance', keys: ['financial', 'money', 'grant', 'subsidy', 'cost', 'hcg', 'ctg', 'smf', 'food'], text: 'P3H helps caregivers explore suitable grants and navigate applications. Its website introduces the Home Caregiving Grant, Caregivers Training Grant, and Seniors’ Mobility and Enabling Fund. Eligibility and approval depend on each scheme; ask the team about current requirements and costs.', source: ['how-we-help.html#financial-support', 'assistance.html#other-assistance'] },
    { title: 'Training and planning ahead', keys: ['training', 'skills', 'learn', 'course', 'planning', 'future'], text: 'P3H includes practical caregiver training and forward care planning. Talk with the team about the skills you want to build and changing care needs; they can advise on suitable training and participation requirements.', source: 'streams/stream-2.html' },
    { title: 'Respite and self-care', keys: ['respite', 'break', 'burnout', 'tired', 'stress', 'overwhelmed', 'self care', 'self-care', 'counselling'], text: 'P3H describes short-term respite at home or at the centre, alongside professional counselling and digital wellness activities. Contact the team to discuss availability and arrangements. Digital activities are available around the clock on a personal device; staff and respite care are not available 24/7.', source: 'streams/stream-3.html' },
    { title: 'Peer support', keys: ['peer', 'buddy', 'lonely', 'connect', 'community', 'group', 'sharing'], text: 'P3H offers peer support and resource sharing, including peer groups and buddy check-ins. Ask the team about current opportunities to connect with other caregivers.', source: 'streams/stream-4.html' },
    { title: 'Activities and venues', keys: ['venue', 'where', 'glow', 'address', 'schedule', 'event', 'activities', 'nanyang'], text: 'P3H soft-launched at GLOW (Nanyang), a Tzu Chi Active Ageing Centre. Confirm current activity dates, venue addresses and accessibility arrangements with the team before attending.', source: 'venues.html' },
    { title: 'Contact the P3H team', keys: ['contact', 'whatsapp', 'email', 'phone', 'hours', 'staff', '24/7', 'register', 'registration', 'sign up'], text: 'Message Nanyang GLOW at 6859 1962 on WhatsApp, message Bukit Batok GLOW at 6347 2801 on WhatsApp, or email caregiversupport@tzuchi.org.sg. Staff contact hours are Monday–Friday, 9am–5pm. You can also use the caregiver support registration form linked on the contact page.', source: 'contact.html' },
    { title: 'Digital wellness', keys: ['digital', 'wellness', 'app', 'install', 'tablet', 'sleep', 'mood', 'journal', 'meditation'], text: 'The P3H platform includes mindfulness, movement, mood logs, journal prompts, sleep planning and community connections. Use a tablet at GLOW or ask the team for help installing it on a personal phone or tablet. The website does not provide a verified installation link.', source: 'programmes.html' }
  ];
  const grants = [
    { name: 'Home Caregiving Grant (HCG)', keys: ['hcg', 'home caregiving grant'], text: 'Monthly cash payouts of up to S$600 to help eligible families care for persons with moderate to severe disabilities.', category: 'Caregiving support' },
    { name: 'South West Caregiver Support Fund', keys: ['south west caregiver', 'caregiver support fund'], text: 'Financial assistance for eligible caregivers in the South West District with self-care and caregiving expenses. The website does not confirm a current payout amount.', category: 'Caregiving support' },
    { name: 'South West Community Caring Fund', keys: ['community caring', 'caring fund'], text: 'S$250 in immediate support for eligible lower-income senior households and families with young children in the South West District.', category: 'Daily living costs' },
    { name: 'ComCare Short-to-Medium-Term Assistance (SMTA)', keys: ['smta', 'short term', 'short to medium', 'temporary financial'], text: 'Temporary financial support for lower-income individuals and families who are temporarily unable to work, looking for work or earning a low income.', category: 'Daily living costs' },
    { name: 'ComCare Long-Term Assistance (LTA)', keys: ['lta', 'long term', 'permanently unable'], text: 'Support for people permanently unable to work due to old age, illness or disability, with little or no financial means or family support.', category: 'Daily living costs' },
    { name: 'Caregivers Training Grant (CTG)', keys: ['ctg', 'caregiver training grant', 'caregivers training grant', 'training subsidy'], text: 'Subsidies for approved caregiver training courses to help caregivers build practical skills at a lower out-of-pocket cost.', category: 'Training and equipment' },
    { name: 'Seniors’ Mobility and Enabling Fund (SMF)', keys: ['smf', 'mobility', 'enabling fund', 'wheelchair', 'hospital bed', 'consumables'], text: 'Subsidies for eligible seniors who need assistive devices or home healthcare consumables.', category: 'Training and equipment' }
  ];
  topics[3].text = 'The grants are grouped by need:\n\nDaily living costs: South West Community Caring Fund and ComCare short-to-medium-term or long-term assistance.\n\nCaregiving support: Home Caregiving Grant (HCG) and South West Caregiver Support Fund.\n\nTraining and equipment: Caregivers Training Grant (CTG) and Seniors’ Mobility and Enabling Fund (SMF).\n\nWhich type of help do you need? Eligibility and approval depend on each scheme.';
  const otherAssistance = [
    { keys: ['hpc', 'hpc+', 'home personal care', 'help with bathing'], text: 'Enhanced Home Personal Care (HPC+) provides personal care and support at home for people who need help with daily living activities.' },
    { keys: ['met', 'medical escort', 'medical transport', 'transport', 'hospital appointment'], text: 'Medical Escort and Transport (MET) provides transport and/or an escort for people who cannot travel independently to medical appointments.' },
    { keys: ['ease', 'senior friendly', 'grab bars', 'home fittings'], text: 'Enhancement for Active Seniors (EASE) subsidises senior-friendly fittings for eligible Singapore Citizen households.' },
    { keys: ['mow', 'meals on wheels', 'meal delivery', 'cannot cook'], text: 'Meals on Wheels (MOW) delivers meals to homebound people who cannot buy or prepare meals and do not have a caregiver who can help.' },
    { keys: ['micro job', 'micro jobs', 'microjob', 'microjobs', 'thkmc', 'job opportunities'], text: 'P3H connects caregivers to simple micro-job opportunities matched to their skills and financial needs, in partnership with Thye Hua Kwan Moral Charities (THKMC).' },
    { keys: ['ffth', 'fth', 'food from the heart', 'food pack', 'food packs', 'community food'], text: 'Food From The Heart Community Food Packs contain 10–12 items such as rice, cooking oil and instant noodles, delivered monthly to our centres.' },
    { keys: ['bop', 'bop monitor', 'bop sensor'], text: 'BOP Monitor and BOP Sensor track activity patterns and notify caregivers of unusual changes, such as sleep patterns or longer bathroom visits. Quantities are limited; ask the team about availability.' },
    { keys: ['caregiver 24 7', 'caregiver 24/7', 'radar', 'fall detector', 'vitals sensor', 'sos call', 'webcam'], text: 'Caregiver 24.7 at Nanyang is a suite of devices including a Vitals Sensor Pad, RADAR Fall Detector, SOS Call Panel and Portable Webcam. Quantities are limited; the name does not mean round-the-clock staffing.' }
  ];
  const tutorials = {
    'Get started': [
      ['Tell us what you need', 'Think about your main caregiving challenge: finding support, learning skills, taking a break or connecting with others.', 'assistance.html'],
      ['Contact the team', 'Open the contact page to find the caregiver registration form, WhatsApp and email. Briefly explain the support you are looking for.', 'contact.html'],
      ['Agree on your next step', 'Discuss suitable support, participation requirements, any costs and access arrangements with the team before attending.', 'faq.html']
    ],
    'Use digital wellness': [
      ['Arrange access', 'Ask the P3H team about installation on your phone or tablet, or tablet access at GLOW. Confirm centre opening arrangements.', 'contact.html'],
      ['Choose a small activity', 'Explore available mindfulness, movement, mood logging or journaling activities. Start with something that suits your needs.', 'programmes.html'],
      ['Build your routine', 'Make time for an activity that feels useful. Ask the team if you need help finding platform features.', 'programmes.html#digital-wellness']
    ],
    'Find caregiver support': [
      ['Explore your options', 'Read about care navigation, training, respite and peer support. Choose the area closest to your current needs.', 'assistance.html'],
      ['Prepare your questions', 'Write down what support you need, your availability and questions about costs or eligibility. Keep private documents out of this chat.', 'resources.html'],
      ['Speak with the team', 'Contact P3H to discuss suitable services and confirm arrangements. Grants and respite availability need individual confirmation.', 'contact.html']
    ]
  };
  const host = document.createElement('div'); host.className = 'p3h-chat';
  host.innerHTML = `<button class="chat-launcher" aria-controls="p3h-chat-panel" aria-expanded="false"><span aria-hidden="true">✦</span> Ask P3H</button>
    <section class="chat-panel" id="p3h-chat-panel" role="dialog" aria-label="P3H assistant" hidden>
      <header class="chat-header"><div class="chat-avatar" aria-hidden="true">✦</div><div><h2>P3H companion</h2><p class="chat-mode">Your local P3H guide</p></div><button class="chat-close" aria-label="Close chat">×</button></header>
      <div class="chat-toolbar"><span>One small step, together.</span><button class="chat-reset">New chat</button></div>
      <div class="chat-messages" role="log" aria-live="polite" aria-relevant="additions" tabindex="0" aria-label="Conversation"></div>
      <div class="chat-suggestions" aria-label="Suggested questions"></div>
      <form class="chat-form"><label class="chat-sr" for="p3h-question">Ask a question about P3H</label><input id="p3h-question" placeholder="Ask a Question" maxlength="1000" autocomplete="off" required><button type="submit" aria-label="Send message">↑</button></form>
      <p class="chat-note">Please leave out personal or medical details. <span class="chat-privacy">Answers use this website’s content.</span></p>
    </section>`;
  document.body.append(host);
  const panel = host.querySelector('.chat-panel'), launcher = host.querySelector('.chat-launcher'), input = host.querySelector('input'), messages = host.querySelector('.chat-messages'), suggestions = host.querySelector('.chat-suggestions'), send = host.querySelector('[type="submit"]');
  let ai = false, busy = false, tour = null, step = 0, history = [], generation = 0, lastTopic = null, pendingRequest = null;
  const normalize = value => value.toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9/]+/g, ' ').trim();
  function remember(question, reply) {
    history.push({ role: 'user', content: question }, { role: 'assistant', content: reply });
    history = history.slice(-10);
  }
  function add(text, role = 'assistant', source) {
    const row = document.createElement('div'); row.className = `chat-message chat-${role}`;
    const label = document.createElement('span'); label.className = 'chat-label'; label.textContent = role === 'user' ? 'You' : 'P3H companion';
    const body = document.createElement('p'); body.textContent = text; row.append(label, body);
    const sources = source ? (Array.isArray(source) ? source : [source]) : role === 'assistant' ? [...new Set(text.match(/(?:streams\/stream-[1-4]|faq|target-groups|how-we-help|assistance|programmes|resources|contact|activities|venues|partners|testimonies)\.html(?:#[a-z0-9-]+)?/g) || [])].slice(0, 3) : [];
    const sourceLabels = {
      'streams/stream-1.html': 'Care Navigation & Financial Assistance',
      'streams/stream-2.html': 'Caregiver Training & Planning Ahead',
      'streams/stream-3.html': 'Self-Care & Respite Support',
      'streams/stream-4.html': 'Peer Support & Resource Sharing',
      'how-we-help.html#financial-support': 'Financial Grants',
      'assistance.html#other-assistance': 'Other Assistance Schemes',
      'contact.html': 'Contact the P3H Team'
    };
    [...new Set(sources.map(canonicalSource))].forEach(path => {
      const a = document.createElement('a');
      a.href = new URL(path, root);
      const labels = {
        'assistance.html#support-1': 'Care navigation',
        'assistance.html#support-2': 'Training & planning',
        'assistance.html#support-3': 'Respite & self-care',
        'assistance.html#support-4': 'Peer support',
        'assistance.html#financial-support': 'Financial grants',
        'assistance.html#other-assistance': 'Care & daily living',
        'assistance.html#training-programmes': 'Training',
        'assistance.html#digital-wellness': 'Digital wellness',
        'assistance.html#who-we-help': 'Who P3H supports',
        'resources.html#faqs': 'Resources & FAQs',
        'contact.html#visit': 'Plan your visit'
      };
      a.textContent = `Read ${labels[path] || sourceLabels[path] || path.split('#')[0].replace('.html', '').replace(/-/g, ' ')} →`;
      row.append(a);
    });
    messages.append(row); messages.scrollTop = messages.scrollHeight;
    return row;
  }
  function showWaiting() {
    const waiting = document.createElement('p');
    waiting.className = 'chat-waiting';
    waiting.textContent = 'Finding a helpful answer';
    messages.append(waiting);
    messages.scrollTop = messages.scrollHeight;
    return waiting;
  }
  async function reply(text, source) {
    const waiting = showWaiting();
    await new Promise(resolve => setTimeout(resolve, 260));
    waiting.remove();
    return add(text, 'assistant', source);
  }
  function chips(labels) {
    suggestions.replaceChildren();
    labels.forEach(label => { const button = document.createElement('button'); button.type = 'button'; button.textContent = label; button.disabled = busy; button.addEventListener('click', () => ask(label)); suggestions.append(button); });
  }
  function welcome() {
    messages.replaceChildren(); history = []; tour = null; lastTopic = null;
    add('Hello, I’m your P3H companion. Ask me about caregiver support, or let me walk you through getting started. How can I help today?');
    chips(['What is P3H?', 'Get started', 'Find caregiver support', 'Use digital wellness']);
  }
  async function showStep() {
    const item = tutorials[tour][step];
    const response = `Step ${step + 1} of ${tutorials[tour].length} · ${item[0]}\n\n${item[1]}${step === 0 ? '\n\nThis guide is based on the P3H website.' : ''}`;
    await reply(response, item[2]); remember(step === 0 ? tour : 'Next step', response);
    chips(step < tutorials[tour].length - 1 ? (step ? ['Previous step', 'Next step', 'Finish tutorial'] : ['Next step', 'Finish tutorial']) : ['Previous step', 'Finish tutorial', 'Contact the P3H team']);
  }
  function local(question) {
    const q = normalize(question).replace(/\b(grnats|garnts)\b/g, 'grants').replace(/\bwhatsap+p?\b/g, 'whatsapp').replace(/\bcare ?givers?\b/g, 'caregiver').replace(/\bfth\b/g, 'ffth').replace(/\b24 7\b/g, '24/7');
    if (/^(hi|hello|hey|thanks|thank you)$/.test(q.trim())) return { text: 'You’re welcome here. I can explain P3H support or guide you through getting started.', source: 'faq.html' };
    if (/\b(emergency|urgent medical|chest pain|cannot breathe)\b/.test(q)) return { text: 'This chatbot cannot assess an emergency or arrange urgent care. Please contact local emergency services or a qualified healthcare professional immediately.', source: 'contact.html' };
    if (/\b(diagnos\w*|medication|dosage|prescri\w*|treatment)\b/.test(q)) return { text: 'I can explain P3H services, but I cannot advise on diagnosis, medicines or treatment. Please ask a qualified healthcare professional. The P3H team can help you explore caregiver support.', source: 'contact.html' };
    if (/\b(ignore|system prompt|developer instructions)\b/.test(q)) return { text: 'I can help with P3H questions and the getting-started guides. What would you like to know about caregiver support?', source: 'faq.html' };
    const matchesPhrase = phrase => (` ${q} `).includes(` ${normalize(phrase)} `);
    if (/\b(what are|which|list|show|tell me about)\b/.test(q) && /\b(schemes?|assistance schemes?|assistant schemes?|financial assistance|grants?|support options?)\b/.test(q)) {
      return {
        text: 'Here are the main options:\n\nFINANCIAL GRANTS\n• Daily living: Community Caring Fund, ComCare SMTA, ComCare LTA\n• Caregiving: Caregiver Support Fund, Home Caregiving Grant (HCG)\n• Training and equipment: Caregivers Training Grant (CTG), Seniors’ Mobility and Enabling Fund (SMF)\n\nOTHER ASSISTANCE\n• Home care: HPC+, MET, EASE\n• Food and work: Meals on Wheels, Micro-jobs, Food From The Heart (FFTH)\n• Monitoring: BOP Monitor and Sensor, Caregiver 24.7\n\nWhich one would you like to know more about?',
        source: 'how-we-help.html#financial-support'
      };
    }
    const services = otherAssistance.filter(service => service.keys.some(matchesPhrase));
    if (services.length) {
      const serviceSources = services.some(service => service.keys.includes('ffth')) ? ['assistance.html#other-assistance', 'contact.html'] : ['assistance.html#other-assistance'];
      const answer = { text: services.map(service => service.text).join('\n\n') + '\n\nOur GLOW teams can help with referrals and confirm arrangements.', source: serviceSources, service: true };
      lastTopic = answer; return answer;
    }
    if (lastTopic?.service && /^(how do i apply|how do i get it|how to apply|can i get it|what documents|am i eligible)$/.test(q)) return { text: 'Our GLOW teams can discuss the service, check referral requirements and help with the next step. WhatsApp Nanyang GLOW at 6859 1962 or Bukit Batok GLOW at 6347 2801. Please keep personal documents out of this chat.', source: 'contact.html' };
    const specific = grants.filter(grant => grant.keys.some(matchesPhrase));
    const application = /\b(apply|application|documents|paperwork)\b/.test(q);
    const eligibility = /\b(eligible|eligibility|qualify|qualifies|criteria)\b/.test(q);
    const followup = /^(and |also |what about )?(how|can i|am i|what|where|tell me more|more)/.test(q) && !specific.length && q.split(' ').length <= 12 && !/\b(training|respite|contact|glow|app|weather|peer|p3h|comcare|grant|grants|daily|income|unemployed)\b/.test(q);
    const selected = specific.length ? specific : followup && lastTopic?.grant ? [lastTopic.grant] : [];
    if (selected.length) {
      const extra = application ? '\n\nTo apply, open the grant page below and follow the official scheme link. Our GLOW teams can help you navigate the application. Please do not send personal documents in this chat.' : eligibility ? '\n\nEligibility depends on the scheme’s assessment. Open its official details on the grant page or ask our GLOW teams to help check the requirements; I cannot confirm approval here.' : '';
      const grantSources = selected.length === 1 && selected[0].name.includes('Home Caregiving') ? ['how-we-help.html#financial-support', 'assistance.html#other-assistance'] : ['how-we-help.html#financial-support'];
      const answer = { text: selected.map(grant => `${grant.name}\n${grant.text}`).join('\n\n') + extra, source: grantSources, grant: selected.length === 1 ? selected[0] : null };
      lastTopic = answer; return answer;
    }
    if (/\b(bukit batok|nanyang)\b/.test(q) && /\b(number|contact|whatsapp|call|phone|reach|message)\b/.test(q)) {
      const both = q.includes('bukit batok') && q.includes('nanyang');
      const answer = { text: both ? 'Nanyang GLOW WhatsApp: 6859 1962.\nBukit Batok GLOW WhatsApp: 6347 2801.' : q.includes('bukit batok') ? 'Bukit Batok GLOW WhatsApp: 6347 2801.' : 'Nanyang GLOW WhatsApp: 6859 1962.', source: 'contact.html' };
      lastTopic = answer; return answer;
    }
    if (/\b(caring for myself|care for myself|who is a caregiver|who can be a caregiver|am i a caregiver)\b/.test(q)) return { text: 'Anyone caring for someone else or themselves is a caregiver. You can contact P3H to explore support; participation and individual grants have their own requirements.', source: 'target-groups.html' };
    if (/\b(comcare|daily living|living costs|unemployed|unemployment|no income|low income)\b/.test(q)) {
      const answer = { text: 'For daily living costs, explore the South West Community Caring Fund, ComCare Short-to-Medium-Term Assistance (temporary support), and ComCare Long-Term Assistance (for people permanently unable to work with little financial or family support). Are you looking for temporary help or longer-term support?', source: 'how-we-help.html#daily-living' };
      lastTopic = answer; return answer;
    }
    if (/^(help|i need help|can you help|help me|i need support)$/.test(q)) return { text: 'What would help most right now: help with money, caregiving skills, a break from caring, or someone to talk to?', source: 'assistance.html' };
    if (application && lastTopic === topics[3]) return { text: 'Which grant would you like to apply for: HCG, a South West fund, ComCare, CTG or SMF? Each scheme has a different process. Our GLOW teams can help with applications.', source: 'how-we-help.html' };
    if (lastTopic && /^(how much|am i eligible|can i qualify|how do i apply|where do i apply)$/.test(q)) return { text: 'Which scheme or service do you mean? Tell me its name so I can point you to the right details.', source: 'how-we-help.html' };
    if (/\b(team|staff|contact)\b/.test(q) && /\b(when|available|hours|reach|call)\b/.test(q)) { lastTopic = topics[8]; return lastTopic; }
    const aliases = { subsidy: ['subsidies'], eligible: ['eligibility'], register: ['registration', 'sign up', 'signup', 'enrol', 'enroll'], respite: ['rest', 'exhausted'], contact: ['telephone', 'call', 'reach'], training: ['train'], digital: ['mindfulness', 'yoga', 'breathing'], grant: ['grants'], venue: ['venues', 'location'], schedule: ['schedules', 'timing', 'when'], peer: ['peers'] };
    const matches = term => { const words = normalize(term); return (` ${q} `).includes(` ${words} `) || (` ${q} `).includes(` ${words}s `); };
    const ranked = topics.map((topic, index) => ({ topic, score: topic.keys.reduce((sum, key) => {
      if (index === 0 && ['p3h', 'what is', 'heart', 'about'].includes(key)) return sum;
      if (['who', 'where', 'help', 'support', 'group', 'cost', 'learn'].includes(key)) return sum + (matches(key) ? 0.5 : 0);
      return sum + ([key, ...(aliases[key] || [])].some(matches) ? 2 : 0);
    }, 0) })).sort((a, b) => b.score - a.score);
    if (/^(what is|whats|tell me about|explain|about) (p3h|humanistic hands and heart)$/.test(q) || q === 'p3h') return topics[0];
    if (lastTopic && /^(tell me more|more|how do i (get|apply for) (it|this)|what about (it|this)|how does it work)$/.test(q)) return lastTopic;
    if (!ranked[0].score) return { text: 'I don’t have a confirmed answer to that in the P3H website content. Try asking about training, respite, financial assistance or digital wellness. For individual advice or current arrangements, please contact the P3H team.', source: 'contact.html' };
    lastTopic = ranked[0].topic; return lastTopic;
  }
  async function ask(question) {
    if (busy || !question.trim()) return;
    question = question.trim().slice(0, 1000); input.value = ''; add(question, 'user');
    const q = normalize(question);
    const tutorial = Object.keys(tutorials).find(title => normalize(title) === q) || (/^(how do i get started|getting started|start tutorial)$/.test(q) ? 'Get started' : null);
    if (tutorial) { tour = tutorial; step = 0; showStep(); return; }
    if (tour && /^(next|next step|continue)$/.test(q)) { step = Math.min(step + 1, tutorials[tour].length - 1); showStep(); return; }
    if (tour && /^(previous|previous step|back)$/.test(q)) { step = Math.max(0, step - 1); showStep(); return; }
    if (tour && /^(finish tutorial|finish|stop tutorial)$/.test(q)) { tour = null; const response = 'You’re ready for your next step. The P3H team can help with individual arrangements.'; await reply(response, 'contact.html'); remember(question, response); chips(['What support is available?', 'Digital wellness', 'Contact the P3H team']); return; }
    tour = null;
    if (!ai) { const answer = local(question); await reply(answer.text, answer.source); remember(question, answer.text); chips(['Get started', 'Use digital wellness', 'Contact the P3H team']); return; }
    busy = true; send.disabled = true; panel.setAttribute('aria-busy', 'true'); chips([]); const current = generation;
    const controller = new AbortController(); pendingRequest = controller;
    const timeout = setTimeout(() => controller.abort(), 35000);
    const waiting = showWaiting();
    try {
      const response = await fetch(new URL('api/chat', root), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: [...history, { role: 'user', content: question }] }), signal: controller.signal });
      if (!response.ok) throw new Error('Chat unavailable');
      const result = await response.json(); if (typeof result.reply !== 'string' || !result.reply.trim() || result.reply.length > 6000) throw new Error('Invalid reply');
      if (current !== generation) return;
      add(result.reply); remember(question, result.reply);
    } catch {
      if (current !== generation) return;
      add('AI is temporarily unavailable. Here is an answer from the local P3H guide:'); const answer = local(question); add(answer.text, 'assistant', answer.source); remember(question, answer.text);
    } finally { clearTimeout(timeout); waiting.remove(); if (current === generation) { pendingRequest = null; busy = false; send.disabled = false; panel.removeAttribute('aria-busy'); chips(['Get started', 'Use digital wellness', 'Contact the P3H team']); if (!panel.hidden) input.focus(); } }
  }
  function toggle(open) { panel.hidden = !open; launcher.setAttribute('aria-expanded', String(open)); if (open) input.focus(); else launcher.focus(); }
  launcher.addEventListener('click', () => toggle(panel.hidden)); host.querySelector('.chat-close').addEventListener('click', () => toggle(false));
  host.querySelector('.chat-reset').addEventListener('click', () => { generation++; pendingRequest?.abort(); pendingRequest = null; busy = false; send.disabled = false; panel.removeAttribute('aria-busy'); welcome(); input.focus(); });
  host.querySelector('form').addEventListener('submit', event => { event.preventDefault(); if (!event.isComposing) ask(input.value); });
  panel.addEventListener('keydown', event => { if (event.key === 'Escape') { event.stopPropagation(); toggle(false); } });
  welcome();
  if (location.protocol !== 'file:') {
    const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), 4000);
    fetch(new URL('api/chat/status', root), { signal: controller.signal }).then(response => response.ok ? response.json() : null).then(status => {
      if (status?.enabled !== true) return; ai = true; host.querySelector('.chat-mode').textContent = 'AI assistant · P3H knowledge'; host.querySelector('.chat-privacy').textContent = 'Questions are sent to OpenAI to answer.';
    }).catch(() => {}).finally(() => clearTimeout(timeout));
  }
})();
