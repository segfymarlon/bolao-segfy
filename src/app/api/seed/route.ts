import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { StageType } from "@prisma/client";

const STAGES = [
  { code: "GROUP", name: "Fase de Grupos", orderIndex: 1, type: StageType.GROUP, scoringBonus: 0 },
  { code: "R32", name: "Fase de 32", orderIndex: 2, type: StageType.KNOCKOUT, scoringBonus: 0 },
  { code: "R16", name: "Oitavas de Final", orderIndex: 3, type: StageType.KNOCKOUT, scoringBonus: 0 },
  { code: "QF", name: "Quartas de Final", orderIndex: 4, type: StageType.KNOCKOUT, scoringBonus: 0 },
  { code: "SF", name: "Semifinal", orderIndex: 5, type: StageType.KNOCKOUT, scoringBonus: 2 },
  { code: "THIRD", name: "Disputa de 3º Lugar", orderIndex: 6, type: StageType.KNOCKOUT, scoringBonus: 1 },
  { code: "FINAL", name: "Final", orderIndex: 7, type: StageType.KNOCKOUT, scoringBonus: 3 },
];

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
    { code: "MOR", name: "Marrocos B" },
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

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");

  if (!process.env.SEED_SECRET || secret !== process.env.SEED_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: string[] = [];

  try {

  // Stages
  for (const stage of STAGES) {
    await prisma.stage.upsert({
      where: { code: stage.code },
      create: stage,
      update: stage,
    });
  }
  results.push(`✅ ${STAGES.length} stages criadas`);

  // Teams
  let teamCount = 0;
  for (const [groupCode, teams] of Object.entries(GROUPS)) {
    for (const team of teams) {
      await prisma.team.upsert({
        where: { fifaCode: team.code },
        create: { fifaCode: team.code, name: team.name, groupCode, isPlaceholder: false },
        update: { name: team.name, groupCode },
      });
      teamCount++;
    }
  }
  results.push(`✅ ${teamCount} times criados (12 grupos)`);

  // Ruleset
  const existing = await prisma.ruleset.findFirst({ where: { isActive: true } });
  if (!existing) {
    await prisma.ruleset.create({
      data: {
        version: 1,
        title: "Regulamento Bolão Copa 2026",
        contentMd: "# Regulamento\n\nVeja a tabela de pontuação abaixo.",
        scoringJson: {
          group: { exactScore: 10, exactDiffAndWinner: 7, correctResult: 5 },
          knockout: { exactScore: 12, correctResult: 8, correctQualified: 4 },
          bonus: { sf: 2, final: 3, third: 1 },
        },
        effectiveFrom: new Date("2026-06-01"),
        isActive: true,
        createdBy: "seed",
      },
    });
    results.push("✅ Ruleset padrão criado");
  } else {
    results.push("⏭️ Ruleset já existia, pulado");
  }

  return NextResponse.json({ ok: true, results });

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
