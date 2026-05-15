import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Termos - Agenda Faculdade",
  description: "Termos de uso da Agenda Faculdade.",
};

export default function TermosPage() {
  return (
    <main className="legal-page">
      <article className="legal-card">
        <p className="section-kicker">Termos de Uso</p>
        <h1>Termos da Agenda Faculdade</h1>
        <p className="muted-text">Ultima atualizacao: 15 de maio de 2026.</p>

        <h2>Uso do servico</h2>
        <p>
          A Agenda Faculdade e uma ferramenta para organizar provas, trabalhos e compromissos academicos. Administradores podem criar e gerenciar eventos;
          membros podem visualizar a agenda e conectar o proprio Google Calendar.
        </p>

        <h2>Conta Google e calendario</h2>
        <p>
          Ao conectar o Google Calendar, o usuario autoriza a Agenda Faculdade a criar, atualizar e remover eventos academicos relacionados ao app. O usuario
          pode desconectar o calendario na tela Perfil ou revogar o acesso diretamente na Conta Google.
        </p>

        <h2>Responsabilidades</h2>
        <p>
          Administradores sao responsaveis pela precisao das datas cadastradas. Usuarios devem conferir informacoes oficiais da faculdade quando houver conflito
          entre a agenda e comunicados institucionais.
        </p>

        <h2>Disponibilidade</h2>
        <p>
          O servico pode passar por manutencoes, atualizacoes ou indisponibilidades temporarias. Faremos esforcos razoaveis para manter o app disponivel.
        </p>

        <h2>Privacidade</h2>
        <p>
          O tratamento de dados pessoais e dados do Google esta descrito na <Link href="/privacidade">Politica de Privacidade</Link>.
        </p>

        <nav className="legal-links" aria-label="Links legais">
          <Link href="/sobre">Sobre</Link>
          <Link href="/privacidade">Privacidade</Link>
          <Link href="/">Entrar no app</Link>
        </nav>
      </article>
    </main>
  );
}
