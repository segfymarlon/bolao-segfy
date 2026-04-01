import { PrismaClient, StageType } from "@prisma/client";

const prisma = new PrismaClient();

const STAGES = [
  { code: "GROUP", name: "Fase de Grupos", orderIndex: 1, type: StageType.GROUP, scoringBonus: 0 },
  { code: "R32", name: "Fase de 32", orderIndex: 2, type: StageType.KNOCKOUT, scoringBonus: 0 },
  { code: "R16", name: "Oitavas de Final", orderIndex: 3, type: StageType.KNOCKOUT, scoringBonus: 0 },
  { code: "QF", name: "Quartas de Final", orderIndex: 4, type: StageType.KNOCKOUT, scoringBonus: 0 },
  { code: "SF", name: "Semifinal", orderIndex: 5, type: StageType.KNOCKOUT, scoringBonus: 2 },
  { code: "THIRD", name: "Disputa de 3º Lugar", orderIndex: 6, type: StageType.KNOCKOUT, scoringBonus: 1 },
  { code: "FINAL", name: "Final", orderIndex: 7, type: StageType.KNOCKOUT, scoringBonus: 3 },
];

// FIFA World Cup 2026 — 48 teams, 12 groups A-L
const GROUPS: Record<string, { code: string; name: string }[]> = {
  A: [
    { code: "USA", name: "Estados Unidos" },
    { code: "MEX", name: "México" },
    { code: "CAN", name: "Canadá" },
    { code: "ARG", name: "Argentina" },
  ],
  B: [
    { code: "BRA", name: "Brasil" },
    { code: "COL", name: "Colômbia" },
    { code: "URU", name: "Uruguai" },
    { code: "PAR", name: "Paraguai" },
  ],
  C: [
    { code: "FRA", name: "França" },
    { code: "ENG", name: "Inglaterra" },
    { code: "BEL", name: "Bélgica" },
    { code: "WAL", name: "País de Gales" },
  ],
  D: [
    { code: "GER", name: "Alemanha" },
    { code: "SPA", name: "Espanha" },
    { code: "POR", name: "Portugal" },
    { code: "NED", name: "Holanda" },
  ],
  E: [
    { code: "ITA", name: "Itália" },
    { code: "CRO", name: "Croácia" },
    { code: "SUI", name: "Suíça" },
    { code: "AUT", name: "Áustria" },
  ],
  F: [
    { code: "MAR", name: "Marrocos" },
    { code: "SEN", name: "Senegal" },
    { code: "EGY", name: "Egito" },
    { code: "NIG", name: "Nigéria" },
  ],
  G: [
    { code: "JPN", name: "Japão" },
    { code: "KOR", name: "Coreia do Sul" },
    { code: "IRN", name: "Irã" },
    { code: "AUS", name: "Austrália" },
  ],
  H: [
    { code: "SAU", name: "Arábia Saudita" },
    { code: "QAT", name: "Catar" },
    { code: "IRQ", name: "Iraque" },
    { code: "UZB", name: "Uzbequistão" },
  ],
  I: [
    { code: "MOR", name: "Marrocos" },
    { code: "ALG", name: "Argélia" },
    { code: "TUN", name: "Tunísia" },
    { code: "CMR", name: "Camarões" },
  ],
  J: [
    { code: "GHA", name: "Gana" },
    { code: "CIV", name: "Costa do Marfim" },
    { code: "MLI", name: "Mali" },
    { code: "ANG", name: "Angola" },
  ],
  K: [
    { code: "CHI", name: "Chile" },
    { code: "ECU", name: "Equador" },
    { code: "VEN", name: "Venezuela" },
    { code: "BOL", name: "Bolívia" },
  ],
  L: [
    { code: "CRC", name: "Costa Rica" },
    { code: "PAN", name: "Panamá" },
    { code: "JAM", name: "Jamaica" },
    { code: "HON", name: "Honduras" },
  ],
};

const RULESET_CONTENT = `# Regulamento — Bolão Copa do Mundo FIFA 2026

## Participação
Este bolão é privado, destinado exclusivamente a colaboradores convidados pela empresa.

## Palpites
- Palpite de placar por partida, enviado antes do início oficial.
- Palpites podem ser editados até o horário do kickoff.
- No mata-mata: campo adicional para o time classificado (pontuação cumulativa).

## Pontuação — Fase de Grupos
| Situação | Pontos |
|---|---|
| Placar exato | 10 pts |
| Saldo exato + vencedor correto | 7 pts |
| Vencedor/empate correto | 5 pts |
| Errou | 0 pts |

## Pontuação — Mata-mata
| Situação | Pontos |
|---|---|
| Placar exato no tempo regulamentar | 12 pts |
| Vencedor/empate correto no tempo regulamentar | 8 pts |
| Classificado correto (cumulativo) | +4 pts |
| Bônus Semifinal | +2 pts |
| Bônus Final | +3 pts |

## Desempate no Ranking
1. Maior número de placares exatos
2. Maior número de acertos de resultado
3. Maior pontuação no mata-mata
4. Maior pontuação em SF + Final
`;

async function main() {
  console.log("🌱 Seeding database...");

  // Stages
  for (const stage of STAGES) {
    await prisma.stage.upsert({
      where: { code: stage.code },
      create: stage,
      update: stage,
    });
  }
  console.log("✅ Stages created");

  // Teams
  for (const [groupCode, teams] of Object.entries(GROUPS)) {
    for (const team of teams) {
      await prisma.team.upsert({
        where: { fifaCode: team.code },
        create: {
          fifaCode: team.code,
          name: team.name,
          groupCode,
          isPlaceholder: false,
        },
        update: { name: team.name, groupCode },
      });
    }
  }
  console.log("✅ Teams created (48 teams, 12 groups)");

  // Default ruleset
  const existingRuleset = await prisma.ruleset.findFirst({ where: { isActive: true } });
  if (!existingRuleset) {
    const adminUser = await prisma.user.findFirst({ where: { role: "ADMIN" } });
    const createdBy = adminUser?.id ?? "seed";

    await prisma.ruleset.create({
      data: {
        version: 1,
        title: "Regulamento Bolão Copa 2026",
        contentMd: RULESET_CONTENT,
        scoringJson: {
          group: { exactScore: 10, exactDiffAndWinner: 7, correctResult: 5 },
          knockout: { exactScore: 12, correctResult: 8, correctQualified: 4 },
          bonus: { sf: 2, final: 3, third: 1 },
        },
        effectiveFrom: new Date("2026-06-01"),
        isActive: true,
        createdBy,
      },
    });
    console.log("✅ Default ruleset created");
  }

  console.log("🎉 Seed complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
