import { normalizeExplanation } from "../src/quiz-core.js";

export const systems = [
  "呼吸系统疾病",
  "心血管系统疾病",
  "消化系统疾病",
  "泌尿系统疾病",
  "女性生殖系统",
  "血液系统疾病",
  "代谢、内分泌系统疾病",
  "神经系统疾病",
  "运动系统疾病",
  "风湿免疫性疾病",
  "儿科疾病",
  "传染病",
  "其他"
];

function buildQuestions(system, rows) {
  return rows.map(([id, sourcePage, clue, answer, aliases = [], notes = "", explanation]) => ({
    id,
    system,
    clue,
    answer,
    aliases,
    sourcePage,
    notes,
    ...(explanation ? { explanation } : {})
  }));
}

function extractKeywords(clue) {
  return String(clue)
    .split(/[+,，。；、]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 5);
}

function buildExplanation(question) {
  const keywords = extractKeywords(question.clue);
  const clues = keywords.map((keyword) => ({
    clue: keyword,
    meaning: explainKeyword(keyword, question)
  }));
  const highlightedKeywords = selectHighlights(keywords, 2).map((item) => `“${item}”`).join("、");

  return {
    clues,
    reasoning: clues.length
      ? `题干中的${highlightedKeywords}等线索同时出现时，更符合${question.answer}的典型表现，因此本题首先考虑${question.answer}。`
      : `题干信息整体更符合${question.answer}的常见表现，因此本题首先考虑${question.answer}。`,
    alternatives: buildAlternatives(question, keywords)
  };
}

function explainKeyword(keyword, question) {
  const matchedRule = keywordMeaningRules.find((rule) => rule.pattern.test(keyword));

  if (matchedRule) {
    return matchedRule.meaning(question.answer, keyword);
  }

  if (/[<>＝=]|mmHg|U\/L|FEV1|CT|MRI|X线|胸片|HCG|ADA|LDH|PaO2|PaCO2/i.test(keyword)) {
    return "这是题干中的检查或化验线索，能明显缩小诊断范围。";
  }

  if (/痛|困难|水肿|出血|黄疸|昏迷|抽搐|偏瘫/.test(keyword)) {
    return `提示出现了关键症状，需要结合其他线索进一步判断，更支持${question.answer}。`;
  }

  return `这是本题需要优先识别的题眼，结合其他表现后更支持${question.answer}。`;
}

function keywordSpecificityScore(keyword) {
  let score = keyword.length;

  if (/[<>＝=]|mmHg|U\/L|FEV1|CT|MRI|HCG|ADA|LDH|PaO2|PaCO2/i.test(keyword)) {
    score += 6;
  }

  if (/桶状胸|盗汗|湿啰音|渗出影|P2>A2|脉搏短绌|硝酸甘油|ST段|方颅|樱桃红|胆碱酯酶|反常呼吸|叶间隙弧形下坠|樱桃红|铁锈色痰|砖红色胶冻状痰|粉红色泡沫状痰/.test(keyword)) {
    score += 4;
  }

  if (/中老年人|青年人|青壮年|青少年|老年人|发热|咳嗽|咳痰|胸痛|腹痛|呼吸困难|心悸/.test(keyword)) {
    score -= 1;
  }

  return score;
}

function selectHighlights(keywords, count = 2) {
  return [...keywords]
    .map((keyword, index) => ({
      keyword,
      index,
      score: keywordSpecificityScore(keyword)
    }))
    .sort((left, right) => right.score - left.score || left.index - right.index)
    .slice(0, count)
    .map((item) => item.keyword);
}

function keywordsOverlap(left, right) {
  return left === right || left.includes(right) || right.includes(left);
}

function deriveClinicalTags(question) {
  const text = `${question.system} ${question.answer} ${question.clue}`;

  return clinicalTagRules
    .filter((rule) => rule.pattern.test(text))
    .map((rule) => rule.tag);
}

function formatQuotedList(items) {
  return items.map((item) => `“${item}”`).join("、");
}

function buildManualAlternatives(question) {
  const answer = question.answer;

  if (answer === "慢性阻塞性肺疾病") {
    return [
      {
        diagnosis: "支气管哮喘",
        reason: "支气管哮喘更强调反复发作、夜间加重和可逆性气流受限，不像本题这样长期咳嗽咳痰并伴FEV1/FVC<70%的持续性下降。"
      }
    ];
  }

  if (answer === "支气管哮喘") {
    return [
      {
        diagnosis: "慢性阻塞性肺疾病",
        reason: "慢阻肺多见于中老年人并常有长期吸烟史，而本题更突出青年人、夜间或凌晨加重和发作后可缓解，更支持支气管哮喘。"
      }
    ];
  }

  if (answer === "肺炎") {
    return [
      {
        diagnosis: "上呼吸道感染",
        reason: "上呼吸道感染通常没有明确肺部湿啰音和胸片渗出影，而本题这两条肺实质受累证据都已给出。"
      },
      {
        diagnosis: "支气管哮喘",
        reason: "哮喘更常见反复喘息和哮鸣音，本题却是发热、咳痰伴渗出影，更符合感染性肺炎。"
      }
    ];
  }

  if (answer === "肺结核") {
    return [
      {
        diagnosis: "普通肺炎",
        reason: "普通肺炎起病通常更急，抗感染治疗往往有效；本题强调长期低热、盗汗和抗生素治疗无效，更支持肺结核。"
      }
    ];
  }

  if (answer === "肺癌") {
    return [
      {
        diagnosis: "肺炎",
        reason: "肺炎多以急性发热和感染表现为主，而本题更突出痰中带血、消瘦和吸烟史，不像单纯感染。"
      },
      {
        diagnosis: "肺结核",
        reason: "肺结核常伴低热、盗汗等慢性感染表现，本题则更强调进行性消耗和肿瘤危险因素，更要先考虑肺癌。"
      }
    ];
  }

  if (answer === "肺栓塞") {
    return [
      {
        diagnosis: "急性心肌梗死",
        reason: "急性心肌梗死也可突发胸痛，但本题还有下肢水肿和P2>A2，提示静脉血栓来源及肺动脉压力升高，更支持肺栓塞。"
      }
    ];
  }

  if (answer === "急性左心衰") {
    return [
      {
        diagnosis: "肺炎",
        reason: "肺炎也会出现呼吸困难，但粉红色泡沫痰更提示肺淤血和急性心功能不全，而不是单纯感染。"
      }
    ];
  }

  if (answer === "心绞痛") {
    return [
      {
        diagnosis: "急性心肌梗死",
        reason: "心肌梗死胸痛通常持续更久，含服硝酸甘油往往不能缓解；本题疼痛持续数分钟且硝酸甘油有效，更符合心绞痛。"
      }
    ];
  }

  if (answer === "ST段抬高型心肌梗死" || answer === "非ST段抬高型心肌梗死") {
    return [
      {
        diagnosis: "心绞痛",
        reason: "心绞痛一般胸痛持续时间较短，休息或含服硝酸甘油后可缓解；本题胸痛持续更久并有相应心电图改变，更支持心肌梗死。"
      }
    ];
  }

  if (answer === "脑出血") {
    return [
      {
        diagnosis: "脑梗死",
        reason: "脑梗死也可出现偏瘫，但脑出血更常见高血压基础上的急性发作和CT高密度影，本题更符合脑出血。"
      }
    ];
  }

  if (answer === "脑梗死") {
    return [
      {
        diagnosis: "脑出血",
        reason: "脑出血常见CT高密度影和更明显的颅内压增高表现，而本题CT阴性且以缺血性神经功能缺损为主，更支持脑梗死。"
      }
    ];
  }

  if (answer === "异位妊娠") {
    return [
      {
        diagnosis: "自然流产",
        reason: "自然流产也可有停经和阴道出血，但本题还强调HCG阳性并需警惕宫外孕相关风险，因此更先考虑异位妊娠。"
      }
    ];
  }

  if (answer === "自然流产") {
    return [
      {
        diagnosis: "异位妊娠",
        reason: "异位妊娠也可表现为停经、腹痛和出血，但本题直接落在妊娠早期流产情境，更先考虑自然流产。"
      }
    ];
  }

  return [];
}

function scoreAlternativeQuestion(question, candidate, questionKeywords) {
  const candidateKeywords = questionKeywordLookup.get(candidate.id) || extractKeywords(candidate.clue);
  const questionTags = questionTagLookup.get(question.id) || [];
  const candidateTags = questionTagLookup.get(candidate.id) || [];

  const sharedKeywordCount = questionKeywords.filter((keyword) =>
    candidateKeywords.some((candidateKeyword) => keywordsOverlap(keyword, candidateKeyword))
  ).length;
  const sharedTagCount = questionTags.filter((tag) => candidateTags.includes(tag)).length;

  let score = sharedKeywordCount * 6 + sharedTagCount * 4;

  if (candidate.answer.includes("癌") === question.answer.includes("癌")) {
    score += 1;
  }

  if (candidate.answer.includes("炎") === question.answer.includes("炎")) {
    score += 1;
  }

  if (candidate.answer.includes("衰") === question.answer.includes("衰")) {
    score += 1;
  }

  if (Math.abs(question.sourcePage - candidate.sourcePage) <= 1) {
    score += 1;
  }

  return score;
}

function buildAlternativeReason(question, candidate, questionKeywords) {
  const candidateKeywords = questionKeywordLookup.get(candidate.id) || extractKeywords(candidate.clue);
  const presentHighlights = selectHighlights(questionKeywords, 2);
  const alternativeHighlights = selectHighlights(
    candidateKeywords.filter((keyword) =>
      !presentHighlights.some((present) => keywordsOverlap(present, keyword))
    ),
    2
  );

  if (alternativeHighlights.length > 0 && presentHighlights.length > 0) {
    return `如果是${candidate.answer}，题干通常更会强调${formatQuotedList(alternativeHighlights)}；而本题更关键的是${formatQuotedList(presentHighlights)}，因此更支持${question.answer}。`;
  }

  if (presentHighlights.length > 0) {
    return `本题给出的${formatQuotedList(presentHighlights)}更支持${question.answer}，与${candidate.answer}的典型表现并不一致。`;
  }

  return `${candidate.answer}的题眼组合与本题并不一致，因此本题更支持${question.answer}。`;
}

function pickAlternativeQuestions(question, questionKeywords) {
  const ranked = questions
    .filter((candidate) => candidate.system === question.system && candidate.id !== question.id)
    .map((candidate) => ({
      question: candidate,
      score: scoreAlternativeQuestion(question, candidate, questionKeywords)
    }))
    .sort((left, right) => right.score - left.score);

  if (ranked.length === 0) {
    return [];
  }

  if (ranked[0].score <= 0) {
    return [ranked[0].question];
  }

  const selected = [ranked[0].question];

  if (ranked[1] && ranked[1].score >= 4) {
    selected.push(ranked[1].question);
  }

  return selected;
}

function buildAlternatives(question, keywords) {
  const manualAlternatives = buildManualAlternatives(question);
  if (manualAlternatives.length > 0) {
    return manualAlternatives;
  }

  return pickAlternativeQuestions(question, keywords).map((candidate) => ({
    diagnosis: candidate.answer,
    reason: buildAlternativeReason(question, candidate, keywords)
  }));
}

const keywordMeaningRules = [
  { pattern: /中老年人/, meaning: () => "提示慢性病、退行性病变或肿瘤性疾病的可能性更大。" },
  { pattern: /青年人|青壮年|青少年/, meaning: () => "提示疾病更偏向年轻人常见病谱，需要优先考虑该年龄段高发疾病。" },
  { pattern: /发热|高热|寒战/, meaning: () => "提示急性感染或明显炎症反应，是感染性疾病的重要线索。" },
  { pattern: /低热|盗汗/, meaning: () => "提示慢性感染或消耗性疾病，结核等疾病中较常见。" },
  { pattern: /咳嗽|咳痰/, meaning: () => "提示病变主要累及呼吸系统，需要从气道或肺实质疾病中判断。" },
  { pattern: /铁锈色痰/, meaning: () => "这是肺炎链球菌肺炎的经典痰液特征，指向性较强。" },
  { pattern: /砖红色胶冻状痰/, meaning: () => "这是克雷伯菌肺炎的典型痰液表现，是很有辨识度的题眼。" },
  { pattern: /粉红色泡沫状痰/, meaning: () => "提示急性肺水肿，常见于急性左心衰。" },
  { pattern: /桶状胸/, meaning: () => "提示长期肺过度充气，是慢性阻塞性肺疾病的常见体征。" },
  { pattern: /FEV1\/FVC<70%/, meaning: () => "提示持续性气流受限，是慢性阻塞性肺疾病的重要诊断依据。" },
  { pattern: /夜间|凌晨加重/, meaning: () => "符合气道高反应性疾病昼夜波动的特点，常见于支气管哮喘。" },
  { pattern: /呼气性呼吸困难/, meaning: () => "提示小气道阻塞，更支持哮喘等阻塞性通气障碍。" },
  { pattern: /大量咯血/, meaning: () => "提示支气管或肺组织有明显破坏，支气管扩张等疾病中较常见。" },
  { pattern: /痰中带血|咯血/, meaning: () => "提示气道或肺组织受损，需要警惕肿瘤、结核等严重病变。" },
  { pattern: /消瘦/, meaning: () => "提示慢性消耗性疾病或恶性肿瘤可能性增加。" },
  { pattern: /吸烟/, meaning: () => "是肺癌和慢阻肺等疾病的重要危险因素，可提高诊断指向性。" },
  { pattern: /湿啰音/, meaning: () => "提示肺泡或细支气管内有渗出物，支持肺实质感染或肺淤血。" },
  { pattern: /渗出影|大片状渗出影/, meaning: () => "影像提示肺实质炎症浸润，是肺炎的重要证据。" },
  { pattern: /抗生素治疗无效/, meaning: () => "提示并非普通细菌感染，需考虑结核、肿瘤或其他特殊病因。" },
  { pattern: /P2>A2/, meaning: () => "提示肺动脉压力升高，常见于肺栓塞等肺循环阻力增加的情况。" },
  { pattern: /下肢水肿/, meaning: () => "提示静脉血栓来源的可能，需要警惕肺栓塞。" },
  { pattern: /突发胸痛/, meaning: () => "提示起病急的胸膜或肺血管事件，常不是慢性疾病的表现。" },
  { pattern: /胸痛/, meaning: () => "提示胸腔或心血管系统急性病变，需要结合持续时间和伴随症状判断。" },
  { pattern: /呼吸困难/, meaning: () => "提示通气或换气受损，是心肺急症里非常重要的判断点。" },
  { pattern: /叩诊鼓音/, meaning: () => "提示胸腔内气体增多，气胸时较典型。" },
  { pattern: /呼吸音消失/, meaning: () => "提示该侧肺通气明显下降，是气胸或大量胸腔积液的重要体征。" },
  { pattern: /叩诊浊音|叩诊实音/, meaning: () => "提示胸腔积液、实变或占位性病变，需要结合其他线索继续分型。" },
  { pattern: /纵隔向健侧移位|气管偏移/, meaning: () => "提示胸腔压力或容量明显变化，常见于大量积液、气胸或脓胸。" },
  { pattern: /胸水ADA>45U\/L/, meaning: () => "ADA升高更支持结核性胸腔积液。" },
  { pattern: /ADA<45U\/L|LDH>500U\/L/, meaning: () => "提示胸水性质偏向恶性或高度炎症性改变，有助于胸腔积液分型。" },
  { pattern: /中性粒细胞升高/, meaning: () => "提示急性炎症反应，更支持感染性病变。" },
  { pattern: /粉红色泡沫状痰/, meaning: () => "提示肺泡内液体渗出，急性左心衰时较典型。" },
  { pattern: /心律绝对不齐|脉搏短绌/, meaning: () => "这是房颤的经典体征组合，指向性很强。" },
  { pattern: /突发突止/, meaning: () => "提示阵发性心律失常发作特点，而不是持续性心律紊乱。" },
  { pattern: /硝酸甘油有效/, meaning: () => "提示心肌缺血可逆，更符合稳定性心绞痛。" },
  { pattern: /硝酸甘油无效/, meaning: () => "提示缺血更重或已出现坏死，需要警惕心肌梗死。" },
  { pattern: /ST段抬高|ST段未抬高/, meaning: () => "这是急性冠脉综合征分型的关键心电图依据。" },
  { pattern: /停经/, meaning: () => "提示首先要进入妊娠相关疾病的判断框架。" },
  { pattern: /阴道流血|阴道出血/, meaning: () => "提示妇产科出血性问题，需要结合停经、腹痛和妊娠状态判断。" },
  { pattern: /HCG阳性/, meaning: () => "说明存在妊娠相关背景，是判断异位妊娠等疾病的关键线索。" },
  { pattern: /无痛性血尿|血尿/, meaning: () => "提示泌尿系统出血，其中无痛性肉眼血尿尤其要警惕肿瘤。" },
  { pattern: /蛋白尿/, meaning: () => "提示肾小球受损，是肾脏疾病的重要实验室线索。" },
  { pattern: /肾区叩痛/, meaning: () => "提示上尿路或肾脏本身受累，常见于肾盂肾炎等疾病。" },
  { pattern: /尿频|尿急|尿痛/, meaning: () => "提示膀胱刺激征，支持尿路感染等下尿路病变。" },
  { pattern: /意识障碍|昏迷/, meaning: () => "提示中枢神经系统受累较重，需要优先考虑急性脑损伤或脑血管事件。" },
  { pattern: /偏瘫/, meaning: () => "提示局灶性神经功能缺损，常见于脑卒中等中枢病变。" },
  { pattern: /CT高密度区/, meaning: () => "提示出血性病变可能性大，是脑出血的重要影像依据。" },
  { pattern: /CT阴性/, meaning: () => "在急性脑卒中场景中更偏向早期缺血性改变，而非明显出血。" }
];

const clinicalTagRules = [
  { tag: "感染", pattern: /发热|高热|寒战|感染|脓|中性粒细胞|渗出影|盗汗/ },
  { tag: "呼吸道症状", pattern: /咳嗽|咳痰|咯血|呼吸困难|湿啰音|桶状胸|FEV1|PaO2|PaCO2|胸水|气胸/ },
  { tag: "胸痛", pattern: /胸痛|P2>A2|硝酸甘油|ST段/ },
  { tag: "肿瘤消耗", pattern: /消瘦|无痛性|肿物|肿块|癌|乳头湿疹样/ },
  { tag: "出血", pattern: /出血|咯血|痰中带血|血尿|黑便|呕血|出血点|瘀斑|阴道流血|阴道出血/ },
  { tag: "妊娠相关", pattern: /停经|HCG|妊娠/ },
  { tag: "神经系统", pattern: /偏瘫|抽搐|昏迷|意识障碍|脑膜刺激征|CT/ },
  { tag: "外伤急症", pattern: /外伤|骨擦|反常呼吸|皮下气肿|气管偏移/ },
  { tag: "泌尿系统", pattern: /尿频|尿急|尿痛|蛋白尿|肾区叩痛|血尿/ },
  { tag: "腹痛消化", pattern: /腹痛|反酸|黑便|黄疸|腹胀|腹泻|里急后重|上腹|右上腹|左下腹|右下腹/ },
  { tag: "肝胆胰", pattern: /黄疸|肝|胆|胰|转氨酶|淀粉酶/ },
  { tag: "心律失常", pattern: /心律绝对不齐|脉搏短绌|突发突止|宽大畸形QRS|心悸/ },
  { tag: "瓣膜病", pattern: /杂音|开瓣音|第一心音|第二肋间/ },
  { tag: "儿科出疹", pattern: /皮疹|手足|口病|黄疸|热性惊厥/ },
  { tag: "风湿免疫", pattern: /蝶形红斑|晨僵|关节|免疫|紫癜|蛋白尿/ },
  { tag: "中毒", pattern: /接触史|大蒜味|胆碱酯酶|COHb|樱桃红|中毒/ }
];

export const questions = [
  ...buildQuestions("呼吸系统疾病", [
    ["resp-001", 1, "中老年人+咳嗽、咳痰数年或数十年+桶状胸+FEV1/FVC<70%", "慢性阻塞性肺疾病", ["慢阻肺"]],
    ["resp-002", 1, "青年人+反复发作咳嗽可自行缓解+夜间或凌晨加重+呼气性呼吸困难", "支气管哮喘"],
    ["resp-003", 1, "青年人+反复咳嗽+大量咯血", "支气管扩张"],
    ["resp-004", 1, "中老年人+痰中带血+刺激性咳嗽+消瘦+固定局限湿啰音+吸烟", "肺癌"],
    ["resp-005", 1, "发热+咳嗽、咳痰+肺部湿啰音+胸片渗出影", "肺炎"],
    ["resp-006", 1, "青壮年+寒战高热+铁锈色痰+大片状渗出影", "肺炎链球菌肺炎"],
    ["resp-007", 1, "老年人+咳嗽+脓黄痰+小空洞", "金黄色葡萄球菌肺炎"],
    ["resp-008", 1, "青少年+刺激性咳嗽+无痰液", "肺炎支原体肺炎"],
    ["resp-009", 1, "中老年人+砖红色胶冻状痰+叶间隙弧形下坠", "克雷伯菌肺炎"],
    ["resp-010", 1, "青年人+长期低热、盗汗+咯血+抗生素治疗无效", "肺结核"],
    ["resp-011", 1, "下肢水肿+突发胸痛+P2>A2", "肺栓塞"],
    ["resp-012", 1, "呼吸困难+肺部叩诊实音、浊音+低热、盗汗+胸水ADA>45U/L", "结核性胸腔积液"],
    ["resp-013", 2, "呼吸困难+肺部叩诊实音、浊音+胸水ADA<45U/L+LDH>500U/L", "恶性胸腔积液"],
    ["resp-014", 2, "呼吸困难+肺部叩诊实音、浊音+胸水中性粒细胞升高", "类肺炎性胸腔积液", [], "助理不要求"],
    ["resp-015", 2, "呼吸困难+肺部叩诊实音、浊音+风湿免疫病史", "结缔组织疾病所致胸腔积液", [], "助理不要求"],
    ["resp-016", 2, "寒战、高热+肺部叩诊实音、浊音+纵隔向健侧移位", "急性脓胸", [], "助理不要求"],
    ["resp-017", 2, "寒战、高热+肺部叩诊实音、浊音+纵隔向患侧移位", "慢性脓胸", [], "助理不要求"],
    ["resp-018", 2, "PaO2<60mmHg", "Ⅰ型呼吸衰竭", [], "助理不要求"],
    ["resp-019", 2, "PaO2<60mmHg+PaCO2>50mmHg", "Ⅱ型呼吸衰竭", [], "助理不要求"],
    ["resp-020", 2, "重症感染、胰腺炎、溺水、多发骨折+顽固性低氧血症+氧合指数<300", "急性呼吸窘迫综合征", [], "助理不要求"],
    ["resp-021", 2, "胸部外伤史+皮下气肿+气管偏移+叩诊鼓音+呼吸音消失", "张力性气胸"],
    ["resp-022", 3, "胸部外伤史+气管偏移+叩诊浊音+胸片示肋膈角消失、弧形阴影", "血胸"],
    ["resp-023", 3, "胸部外伤史+骨擦音或骨擦感+胸部挤压征阳性+反常呼吸", "多根多处肋骨骨折", ["连枷胸"]]
  ]),
  ...buildQuestions("心血管系统疾病", [
    ["cardio-001", 3, "感染+咳粉红色泡沫状痰+呼吸困难", "急性左心衰"],
    ["cardio-002", 3, "肝颈静脉回流征阳性+呼吸困难", "右心衰"],
    ["cardio-003", 3, "血压>140/90mmHg", "高血压"],
    ["cardio-004", 3, "第一心音强弱不等+心律绝对不齐+脉搏短绌", "房颤", ["心房颤动"], "助理不要求"],
    ["cardio-005", 3, "青年人+心悸+突发突止", "阵发性室上性心动过速", [], "助理不要求"],
    ["cardio-006", 3, "心室夺获或室性融合波+宽大畸形QRS波", "室性心动过速", [], "助理不要求"],
    ["cardio-007", 3, "胸痛+持续数分钟+口服硝酸甘油有效", "心绞痛"],
    ["cardio-008", 3, "胸痛+持续数十分钟+口服硝酸甘油无效+ST段抬高", "ST段抬高型心肌梗死", ["STEMI"]],
    ["cardio-009", 4, "胸痛+持续数十分钟+口服硝酸甘油无效+ST段未抬高", "非ST段抬高型心肌梗死", ["NSTEMI"]],
    ["cardio-010", 4, "心尖部隆隆样舒张中晚期杂音+心尖区第一心音亢进和开瓣音", "二尖瓣狭窄", [], "助理不要求"],
    ["cardio-011", 4, "心尖部收缩期杂音", "二尖瓣反流", [], "助理不要求"],
    ["cardio-012", 4, "胸骨右缘第二肋间收缩期喷射样杂音", "主动脉瓣狭窄", [], "助理不要求"],
    ["cardio-013", 4, "胸骨右缘第二肋间舒张期杂音+心尖部隆隆样舒张中晚期杂音", "主动脉瓣反流", [], "助理不要求"],
    ["cardio-014", 4, "低热、盗汗、乏力、纳差+呼吸困难", "结核性心包炎", [], "助理不要求"]
  ]),
  ...buildQuestions("消化系统疾病", [
    ["digest-001", 4, "胸骨后痛+反酸烧心烧灼感+抗酸药物治疗有效", "胃食管反流病"],
    ["digest-002", 4, "进行性吞咽困难", "食管癌"],
    ["digest-003", 4, "饮酒或NSAIDs史+上腹不适或隐痛+黑便", "急性胃炎"],
    ["digest-004", 4, "上腹不适+嗳气恶心", "慢性胃炎"],
    ["digest-005", 5, "周期性饱餐痛+进食痛+进餐后疼痛缓解", "胃溃疡"],
    ["digest-006", 5, "周期性饥饿痛+夜间痛+进食后缓解", "十二指肠溃疡"],
    ["digest-007", 5, "溃疡病史+突发上腹痛+膈肌下游离气体", "溃疡穿孔"],
    ["digest-008", 5, "消化道相关疾病病史+呕血加黑便", "消化道出血"],
    ["digest-009", 5, "上腹部不规则疼痛+消瘦+纳差+左锁骨上肿大", "胃癌"],
    ["digest-010", 5, "数十年乙肝病史+肝功能减退+蜘蛛痣、肝掌", "肝硬化"],
    ["digest-011", 5, "肥胖或代谢异常+转氨酶升高", "非酒精性脂肪性肝病", [], "助理不要求"],
    ["digest-012", 5, "胆道疾病等+发热+右上腹痛+肝区叩击痛", "肝脓肿", [], "助理不要求"],
    ["digest-013", 5, "肝病史多年+右上腹痛+肝大+右上腹压痛+肿块硬", "肝癌", [], "助理不要求"],
    ["digest-014", 5, "右上腹痛+墨菲征+有无黄疸", "胆石症、胆囊炎"],
    ["digest-015", 5, "Reynolds五联征+白细胞高", "急性梗阻性化脓性胆管炎"],
    ["digest-016", 5, "饮酒或暴饮暴食+中上腹痛向腰背放射+淀粉酶升高", "急性胰腺炎"],
    ["digest-017", 5, "进行性黄疸+右上腹无痛性肿块", "胰腺癌", [], "助理不要求"],
    ["digest-018", 6, "黏液脓血便+左下腹痛+抗生素治疗无效", "溃疡性结肠炎", [], "助理不要求"],
    ["digest-019", 6, "右下腹痛+糊状便+无黏液脓血便+抗生素治疗无效", "克罗恩病", [], "助理不要求"],
    ["digest-020", 6, "痛、吐、胀、闭", "肠梗阻"],
    ["digest-021", 6, "老年人+腹部隐痛+左或右侧腹包块+大便性状改变", "结肠、直肠癌"],
    ["digest-022", 6, "低热、盗汗、乏力、纳差+糊状便+抗生素治疗无效", "肠结核", [], "助理不要求"],
    ["digest-023", 6, "低热、盗汗、乏力、纳差+腹壁柔韧感", "结核性腹膜炎"],
    ["digest-024", 6, "转移性右下腹痛+麦氏点压痛", "急性阑尾炎"],
    ["digest-025", 6, "肛门肿物脱出+无痛性血便", "痔疮"],
    ["digest-026", 6, "排便时伴有剧痛+便秘病史", "肛裂"],
    ["digest-027", 6, "儿童或青壮年+可复性腹股沟肿块进入阴囊", "腹股沟斜疝"],
    ["digest-028", 6, "老年男性+腹股沟区半球形肿块+不进入阴囊", "腹股沟直疝"],
    ["digest-029", 6, "中年妇女+大腿下方半球形肿物+不易回纳", "股疝"],
    ["digest-030", 6, "左胁部外伤史+休克", "脾破裂"],
    ["digest-031", 6, "右胁部外伤史+血压下降+腹膜刺激征", "肝破裂"],
    ["digest-032", 6, "腹部外伤+腹膜刺激征", "小肠破裂"],
    ["digest-033", 6, "腹部外伤史+血尿", "肾损伤"]
  ]),
  ...buildQuestions("泌尿系统疾病", [
    ["urinary-001", 7, "青年人+链球菌感染史+血尿+补体下降", "急性肾小球肾炎", [], "助理不要求"],
    ["urinary-002", 7, "蛋白尿+血尿+水肿+高血压>3个月", "慢性肾小球肾炎"],
    ["urinary-003", 7, "大量蛋白尿+低蛋白血症+水肿+高脂血症", "肾病综合征", [], "助理不要求"],
    ["urinary-004", 7, "发热+肾区叩痛+脓尿+膀胱刺激征", "急性肾盂肾炎"],
    ["urinary-005", 7, "膀胱刺激征+无发热+无肾区叩痛+无白细胞管型", "急性膀胱炎"],
    ["urinary-006", 7, "阵发性绞痛+血尿", "尿路结石"],
    ["urinary-007", 7, "老年男性+膀胱刺激征+进行性排尿困难", "前列腺增生"],
    ["urinary-008", 7, "无痛性肉眼血尿+B超提示膀胱占位", "膀胱癌", [], "助理不要求"],
    ["urinary-009", 7, "休克、药物等病史+肌酐明显升高+肾功能进行性恶化+高钾血症", "急性肾衰竭", [], "助理不要求"],
    ["urinary-010", 7, "肌酐明显升高+肾功能进行性恶化+高钾血症", "慢性肾衰竭", [], "助理不要求"]
  ]),
  ...buildQuestions("女性生殖系统", [
    ["female-001", 8, "妊娠<28周+腹痛及阴道流血", "自然流产"],
    ["female-002", 8, "停经史+阴道出血+HCG阳性", "异位妊娠"],
    ["female-003", 8, "妊娠期收缩压≥140mmHg或舒张压≥90mmHg+尿蛋白(+)", "子痫前期"],
    ["female-004", 8, "妊娠期收缩压≥160mmHg或舒张压≥110mmHg+尿蛋白(+)", "重度子痫前期"],
    ["female-005", 8, "妊娠期高血压+抽搐", "子痫"],
    ["female-006", 8, "妊娠+无痛性阴道流血", "前置胎盘"],
    ["female-007", 8, "妊娠+疼痛+阴道流血", "胎盘早剥"],
    ["female-008", 8, "产后阴道流血量较多", "产后出血", [], "助理不要求"],
    ["female-009", 8, "人流史或剖宫产术后+下腹痛+脓性分泌物", "急性盆腔炎", [], "助理不要求"],
    ["female-010", 8, "中老年妇女+接触性出血或阴道不规则出血", "宫颈癌"],
    ["female-011", 8, "绝经后阴道流血", "子宫内膜癌", [], "助理不要求"],
    ["female-012", 8, "经量增多或经期延长+周期正常+子宫局部增大", "子宫肌瘤"],
    ["female-013", 8, "老年女性+腹胀+腹部包块+直肠子宫凹处可触及实性包块", "卵巢癌"],
    ["female-014", 8, "继发性痛经+盆腔伴有巧克力囊肿", "子宫内膜异位症"],
    ["female-015", 9, "青春期或绝经过渡期+经量大小不一+经期长短不一", "无排卵性异常子宫出血", [], "助理不要求"],
    ["female-016", 9, "月经频发", "黄体功能不足", [], "助理不要求"],
    ["female-017", 9, "月经淋滴不尽", "黄体萎缩不全", [], "助理不要求"]
  ]),
  ...buildQuestions("血液系统疾病", [
    ["blood-001", 9, "女性月经过多+苍白、乏力+骨髓红系增生活跃", "缺铁性贫血"],
    ["blood-002", 9, "贫血+出血+感染+骨髓增生减低", "再生障碍性贫血"],
    ["blood-003", 9, "贫血+出血+感染+骨髓增生活跃+原始细胞≥20%", "急性白血病"],
    ["blood-004", 9, "颈部无痛性淋巴结肿大", "淋巴瘤", [], "助理不要求"],
    ["blood-005", 9, "出血+血小板减少+骨髓产板巨核细胞减少", "原发免疫性血小板减少症", [], "助理不要求"]
  ]),
  ...buildQuestions("代谢、内分泌系统疾病", [
    ["endo-001", 10, "女性+高代谢+多汗、心悸、易激动+突眼+甲状腺肿大", "甲状腺功能亢进"],
    ["endo-002", 10, "机体各项机能低下+T3、T4下降+TSH升高", "甲状腺功能减退症"],
    ["endo-003", 10, "青少年+三多一少症状+空腹血糖≥7.0mmol/L或随机血糖≥11.1mmol/L", "1型糖尿病"],
    ["endo-004", 10, "中老年人+三多一少症状+空腹血糖≥7.0mmol/L或随机血糖≥11.1mmol/L", "2型糖尿病"]
  ]),
  ...buildQuestions("神经系统疾病", [
    ["neuro-001", 10, "老年人+高血压病史+情绪激动+意识障碍+CT高密度区", "脑出血"],
    ["neuro-002", 10, "老年人+高血压病史+激动或安静时急性发作+偏瘫+CT阴性", "脑梗死"],
    ["neuro-003", 10, "剧烈头痛+脑膜刺激征阳性+血性脑脊液", "蛛网膜下腔出血", [], "助理不要求"],
    ["neuro-004", 10, "典型中间清醒期+CT双凸面镜影", "急性硬膜外血肿", [], "助理不要求"],
    ["neuro-005", 10, "昏迷进行性加重+脑CT新月形阴影", "硬膜下血肿", [], "助理不要求"],
    ["neuro-006", 10, "头部较大血肿+头皮下波动感", "头皮血肿", [], "助理不要求"],
    ["neuro-007", 11, "短暂意识障碍+逆行性遗忘+各种检查都阴性", "脑震荡", [], "助理不要求"],
    ["neuro-008", 11, "意识障碍+头痛、恶心呕吐+脑CT多发散在高低密度区", "脑挫裂伤", [], "助理不要求"],
    ["neuro-009", 11, "患者迅速昏迷+瞳孔改变+生命体征不稳定", "脑干损伤", [], "助理不要求"],
    ["neuro-010", 11, "头颅X线或CT示骨连续性中断", "颅骨骨折", [], "助理不要求"],
    ["neuro-011", 11, "外伤史+头痛+眼眶部熊猫眼征", "颅前窝骨折", [], "助理不要求"],
    ["neuro-012", 11, "外伤史+头痛+鼻漏或耳漏", "颅中窝骨折", [], "助理不要求"],
    ["neuro-013", 11, "外伤史+头痛+Batte征", "颅后窝骨折", [], "助理不要求"],
    ["neuro-014", 11, "头痛、呕吐、视盘水肿+头颅CT或MRI提示占位病变", "颅内肿瘤", [], "助理不要求"],
    ["neuro-015", 11, "胸背部疼痛+脊髓半切综合征", "椎管内肿瘤", [], "助理不要求"]
  ]),
  ...buildQuestions("运动系统疾病", [
    ["ortho-001", 12, "大、小结节与肱骨干交界区骨皮质不连续", "肱骨外科颈骨折"],
    ["ortho-002", 12, "肱骨干骨皮质不连续", "肱骨干骨折"],
    ["ortho-003", 12, "肱骨髁上方骨皮质不连续+肘后三角关系正常", "肱骨髁上骨折"],
    ["ortho-004", 12, "枪刺手或银叉样畸形", "Colles骨折"],
    ["ortho-005", 12, "骨盆挤压和分离试验阳性+休克", "骨盆骨折"],
    ["ortho-006", 12, "下肢屈曲、短缩、外旋畸形+外旋45°~60°", "股骨颈骨折"],
    ["ortho-007", 12, "下肢屈曲、短缩、外旋畸形+外旋可达90°", "股骨粗隆间骨折"],
    ["ortho-008", 12, "股骨干骨皮质不连续", "股骨干骨折"],
    ["ortho-009", 12, "胫腓骨干骨皮质不连续", "胫腓骨干骨折"],
    ["ortho-010", 12, "肩关节活动障碍+方肩畸形+Dugas征阳性", "肩关节脱位"],
    ["ortho-011", 12, "肘后三角关系丧失", "肘关节脱位"],
    ["ortho-012", 12, "<5岁儿童+上肢牵拉史+肘关节外侧压痛", "桡骨头半脱位"],
    ["ortho-013", 12, "屈曲、外展、外旋畸形", "髋关节前脱位"],
    ["ortho-014", 12, "屈曲、内收、内旋畸形", "髋关节后脱位"],
    ["ortho-015", 12, "颈肩痛向上肢放射+Eaton征及Spurling征阳性", "神经根型颈椎病", [], "助理不要求"],
    ["ortho-016", 12, "四肢乏力+行走、持物不稳+病理征阳性", "脊髓型颈椎病", [], "助理不要求"],
    ["ortho-017", 13, "眩晕、猝倒、头痛、视觉障碍+神经检查阴性", "椎动脉型颈椎病", [], "助理不要求"],
    ["ortho-018", 13, "交感神经兴奋或抑制表现+头痛、头晕、心跳加速或眼花流泪", "交感神经型颈椎病", [], "助理不要求"],
    ["ortho-019", 13, "青壮年+腰痛+下肢放射痛+直腿抬高试验阳性", "腰椎间盘突出症"],
    ["ortho-020", 13, "老年人+关节局部疼痛、畸形+X线提示关节间隙狭窄和骨质增生", "骨关节炎"]
  ]),
  ...buildQuestions("风湿免疫性疾病", [
    ["rheum-001", 13, "全身、对称、多发小关节肿痛+晨僵>1小时+类风湿因子或抗CCP抗体阳性", "类风湿关节炎"],
    ["rheum-002", 13, "多系统症状+抗Sm或抗dsDNA抗体阳性+大关节肿痛", "系统性红斑狼疮"],
    ["rheum-003", 13, "高嘌呤饮食+第一跖趾关节红肿热痛", "痛风"]
  ]),
  ...buildQuestions("儿科疾病", [
    ["peds-001", 14, "寒战高热+咳嗽咳痰+典型X线表现", "支气管肺炎"],
    ["peds-002", 14, "秋冬季发病+黄色或蛋花样大便+患儿全身情况好", "秋季腹泻"],
    ["peds-003", 14, "高热3~4天出疹+上感+全身丘疹+Koplik斑", "麻疹"],
    ["peds-004", 14, "热退疹出", "幼儿急疹"],
    ["peds-005", 14, "全身症状轻+发热半天出疹+红色斑丘疹+耳后淋巴结肿大", "风疹", [], "助理不要求"],
    ["peds-006", 14, "四世同堂+斑疹、丘疹、疱疹、结痂", "水痘", [], "助理不要求"],
    ["peds-007", 14, "高热1~2天+咽痛+草莓舌+苍白圈+皱褶部位皮疹密集", "猩红热", [], "助理不要求"],
    ["peds-008", 14, "手、足、口多发丘疹", "手足口病"],
    ["peds-009", 14, "冬季出生+颅骨软化+方颅+钙下降+血磷下降", "维生素D缺乏性佝偻病", [], "助理不要求"],
    ["peds-010", 14, "全身发作+短暂发作+1次发热中发作1~2次+总次数≤4次", "单纯型热性惊厥"],
    ["peds-011", 14, "局限性发作+长时间发作+24小时内反复发作+总次数≥5次", "复杂型热性惊厥"],
    ["peds-012", 15, "一般情况不好+出生后24小时内出现+持续时间超过2周", "病理性黄疸", [], "助理不要求"],
    ["peds-013", 15, "一般情况良好+出生后2~3天出现+多在2周内消退", "生理性黄疸", [], "助理不要求"],
    ["peds-014", 15, "发热+皮疹+浅表淋巴结肿大+手足硬性水肿", "川崎病", [], "助理不要求"]
  ]),
  ...buildQuestions("传染病", [
    ["infect-001", 15, "不洁饮食史+黄疸+肝指标升高", "急性甲型黄疸型肝炎"],
    ["infect-002", 15, "长期乙肝病史+黄疸+肝功能减退", "慢性乙型肝炎"],
    ["infect-003", 15, "不洁饮食史+黏液脓血便+里急后重", "细菌性痢疾"],
    ["infect-004", 15, "皮肤瘀点和瘀斑+头痛+脑膜刺激征+脑脊液特征性改变", "流行性脑脊髓膜炎", [], "助理不要求"],
    ["infect-005", 15, "吸毒、输血或同性恋病史+HIV抗体阳性", "艾滋病"],
    ["infect-006", 15, "发热+尿蛋白阳性+出血点", "肾综合征出血热"]
  ]),
  ...buildQuestions("其他", [
    ["other-001", 16, "一个毛囊的炎症", "疖"],
    ["other-002", 16, "多发毛囊的炎症", "痈"],
    ["other-003", 16, "疏松结缔组织炎症+界限不清", "急性蜂窝织炎"],
    ["other-004", 16, "下肢淋巴管炎症+分界清楚", "丹毒"],
    ["other-005", 16, "手指腹的红肿热痛", "指头炎"],
    ["other-006", 16, "一侧甲沟的红肿热痛", "甲沟炎"],
    ["other-007", 16, "哺乳期妇女+乳房红肿热痛+功能障碍", "急性乳腺炎"],
    ["other-008", 16, "中老年女性+乳房外上象限无痛性肿物", "乳腺癌"],
    ["other-009", 16, "乳房红肿无发热+腋窝淋巴结肿大", "炎性乳癌"],
    ["other-010", 16, "乳房外上象限无痛性肿物+乳头湿疹样改变", "乳头湿疹样乳癌", ["Paget病"]],
    ["other-011", 16, "有机磷接触史+大蒜味+M、N样症状+针尖样瞳孔+胆碱酯酶活力下降", "有机磷中毒"],
    ["other-012", 16, "煤气炉接触史+口唇樱桃红+COHb升高", "CO中毒"],
    ["other-013", 16, "昏迷+镇静催眠药物服用病史", "镇静催眠药中毒", [], "助理不要求"]
  ])
];

const questionKeywordLookup = new Map(
  questions.map((question) => [question.id, extractKeywords(question.clue)])
);

const questionTagLookup = new Map(
  questions.map((question) => [question.id, deriveClinicalTags(question)])
);

questions.forEach((question) => {
  if (!question.explanation) {
    question.explanation = buildExplanation(question);
  }

  question.explanation = normalizeExplanation(question.explanation);
});
