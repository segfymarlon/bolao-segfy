import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
  return format(new Date(date), "dd/MM/yyyy", { locale: ptBR });
}

export function formatDateTime(date: Date | string): string {
  return format(new Date(date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
}

export function formatTime(date: Date | string): string {
  return format(new Date(date), "HH:mm", { locale: ptBR });
}

export function formatRelative(date: Date | string): string {
  return formatDistanceToNow(new Date(date), { locale: ptBR, addSuffix: true });
}

export function isMatchLocked(kickoffAt: Date | string): boolean {
  return new Date() >= new Date(kickoffAt);
}

export function getMatchStatusLabel(status: string): string {
  const map: Record<string, string> = {
    SCHEDULED: "Agendado",
    LIVE: "Ao vivo",
    FINISHED: "Encerrado",
    POSTPONED: "Adiado",
    CANCELLED: "Cancelado",
  };
  return map[status] ?? status;
}

export function getInvitationStatusLabel(status: string): string {
  const map: Record<string, string> = {
    PENDING: "Pendente",
    ACCEPTED: "Aceito",
    REVOKED: "Revogado",
  };
  return map[status] ?? status;
}

export function getStageLabel(code: string): string {
  const map: Record<string, string> = {
    GROUP: "Fase de Grupos",
    R32: "Fase de 32",
    R16: "Oitavas de Final",
    QF: "Quartas de Final",
    SF: "Semifinal",
    THIRD: "Disputa de 3º Lugar",
    FINAL: "Final",
  };
  return map[code] ?? code;
}
