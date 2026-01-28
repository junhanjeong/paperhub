export interface Tool {
    id: number;
    title: string;
    desc: string;
    category: string;
    categoryLabel: string;
    tagColor: string;
    icon: string;
    link: string;
    howto: string;
    likes: number;
    isInternal?: boolean;
    actionText?: string;
}

export const toolsData: Tool[] = [
    { id: 20, title: "Final Author Name Converter", desc: "쉼표(,)를 'and'로, 이름 사이 공백을 '~'로 변환합니다. BibTeX와 논문 저자 목록을 작성할 때 필수적인 도구입니다.", category: "writing", categoryLabel: "LaTeX", tagColor: "blue", icon: "user-check", link: "#", howto: "1. 저자 목록을 입력하세요.\n2. 쉼표는 'and'로, 이름 사이 공백은 '~'로 바뀝니다.", likes: 120, isInternal: true, actionText: "변환기 사용하기" },
    { id: 17, title: "Improvement Calculator", desc: "실험 결과의 성능 향상 폭(Improvement Rate)을 계산합니다. Baseline 대비 얼마나 좋아졌는지 확인하세요.", category: "calc", categoryLabel: "계산기", tagColor: "indigo", icon: "calculator", link: "#", howto: "수치를 입력하여 향상 폭을 즉시 계산하세요.", likes: 85, isInternal: true, actionText: "계산기 열기" },
    { id: 18, title: "OpenReview", desc: "학술 논문 리뷰 및 투고 시스템입니다. 주요 학회 논문의 투명한 리뷰 과정을 확인하세요.", category: "submit", categoryLabel: "투고", tagColor: "blue", icon: "check-square", link: "https://openreview.net/", howto: "주요 AI 학회의 리뷰 현황을 파악할 수 있습니다.", likes: 142 },
    { id: 19, title: "Paper Copilot", desc: "학회 투고 일정 및 논문 관리 도구입니다. 복잡한 마감 기한과 필수 체크리스트를 관리하세요.", category: "submit", categoryLabel: "투고", tagColor: "emerald", icon: "send", link: "https://papercopilot.com/", howto: "학회 일정을 검색하고 개인 대시보드에 추가하세요.", likes: 98 },
    { id: 13, title: "Hugging Face Papers", desc: "AI 및 머신러닝 분야의 최신 트렌딩 논문들을 실시간으로 확인합니다.", category: "screening", categoryLabel: "논문 스크리닝", tagColor: "yellow", icon: "trending-up", link: "https://huggingface.co/papers/trending", howto: "최신 연구 동향을 한눈에 파악하세요.", likes: 215 },
    { id: 14, title: "AlphaXiv", desc: "arXiv 논문에 대해 실시간으로 의견을 나누고 토론할 수 있는 오픈 커뮤니티입니다.", category: "screening", categoryLabel: "논문 스크리닝", tagColor: "blue", icon: "message-square", link: "https://alphaxiv.org/", howto: "arXiv 논문 ID를 입력하여 토론에 참여하세요.", likes: 156 },
    { id: 15, title: "Scholar Inbox", desc: "사용자의 관심 분야를 학습하여 매일 arXiv 논문을 추천해주는 서비스입니다.", category: "screening", categoryLabel: "논문 스크리닝", tagColor: "emerald", icon: "inbox", link: "https://scholarinbox.com/", howto: "맞춤형 논문 피드를 받아보세요.", likes: 182 },
    { id: 3, title: "Zotero", desc: "오픈 소스 참고문헌 관리 도구. 인용을 자동화합니다.", category: "citation", categoryLabel: "인용구/레퍼런스", tagColor: "indigo", icon: "bookmark", link: "https://www.zotero.org", howto: "서지 정보를 쉽고 빠르게 저장하고 관리하세요.", likes: 189 },
    { id: 4, title: "Google Scholar", desc: "전 세계 학술 문헌 검색 엔진입니다.", category: "search", categoryLabel: "국내외 DB", tagColor: "orange", icon: "search", link: "https://scholar.google.com", howto: "학술 연구 자료를 광범위하게 검색하세요.", likes: 433 },
    { id: 7, title: "Squoosh", desc: "이미지 크기 조절 및 최적화 도구입니다.", category: "figure", categoryLabel: "그림/도식", tagColor: "rose", icon: "image", link: "https://squoosh.app/", howto: "이미지 용량을 획기적으로 줄여보세요.", likes: 120 },
    { id: 16, title: "Gradients", desc: "논문용 도식이나 발표 자료에 활용하기 좋은 세련된 그라데이션 팔레트입니다.", category: "figure", categoryLabel: "그림/도식", tagColor: "blue", icon: "palette", link: "https://gradients.app/en", howto: "색상 코드 값을 복사하여 사용하세요.", likes: 95 },
    { id: 8, title: "ChatGPT", desc: "OpenAI의 대화형 AI.", category: "llm", categoryLabel: "LLM 도구", tagColor: "emerald", icon: "message-square", link: "https://chatgpt.com/", howto: "논문 초고 작성 및 브레인스토밍에 활용하세요.", likes: 890 },
    { id: 9, title: "Gemini", desc: "Google의 최신 AI 모델.", category: "llm", categoryLabel: "LLM 도구", tagColor: "blue", icon: "sparkles", link: "https://gemini.google.com/", howto: "실시간 정보 요약 및 데이터 분석에 탁월합니다.", likes: 654 },
    { id: 10, title: "Claude", desc: "Anthropic의 AI 모델.", category: "llm", categoryLabel: "LLM 도구", tagColor: "purple", icon: "brain", link: "https://claude.ai/", howto: "긴 논문 분석 및 정교한 교정에 적합합니다.", likes: 721 },
    { id: 11, title: "Overleaf", desc: "웹 기반의 협업용 LaTeX 에디터입니다.", category: "writing", categoryLabel: "LaTeX", tagColor: "indigo", icon: "edit-3", link: "https://www.overleaf.com/", howto: "공동 저자와 실시간으로 협업하세요.", likes: 452 },
    { id: 12, title: "Word Counter", desc: "실시간 단어 수 계산 도구입니다.", category: "writing", categoryLabel: "LaTeX", tagColor: "orange", icon: "type", link: "https://wordcounter.net/", howto: "텍스트 분량을 실시간으로 체크하세요.", likes: 310 }
];
