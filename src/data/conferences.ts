export interface Conference {
    name: string;
    full: string;
    deadline: { y: number; m: number; d: number };
    period: { start: { y: number; m: number; d: number }; end: { y: number; m: number; d: number } };
    color: string;
}

export const conferences: Conference[] = [
    { name: "ICLR 2026", full: "Learning Representations", deadline: { y: 2026, m: 1, d: 20 }, period: { start: { y: 2026, m: 5, d: 4 }, end: { y: 2026, m: 5, d: 8 } }, color: "indigo" },
    { name: "AAAI 2026", full: "Artificial Intelligence", deadline: { y: 2025, m: 8, d: 15 }, period: { start: { y: 2026, m: 2, d: 5 }, end: { y: 2026, m: 2, d: 11 } }, color: "pink" },
    { name: "CVPR 2026", full: "Computer Vision", deadline: { y: 2025, m: 11, d: 10 }, period: { start: { y: 2026, m: 6, d: 14 }, end: { y: 2026, m: 6, d: 19 } }, color: "blue" },
    { name: "ICML 2026", full: "Machine Learning", deadline: { y: 2026, m: 1, d: 28 }, period: { start: { y: 2026, m: 7, d: 12 }, end: { y: 2026, m: 7, d: 18 } }, color: "emerald" },
    { name: "KCC 2026", full: "Korea Computer Congress", deadline: { y: 2026, m: 4, d: 20 }, period: { start: { y: 2026, m: 6, d: 24 }, end: { y: 2026, m: 6, d: 26 } }, color: "orange" }
];
