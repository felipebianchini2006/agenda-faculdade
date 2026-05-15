import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Sobre - Agenda Faculdade",
  description: "Informacoes publicas da Agenda Faculdade para usuarios e revisao OAuth do Google.",
};

export default function SobrePage() {
  return (
    <main className="legal-page">
      <section className="legal-card">
        <p className="section-kicker">Agenda Faculdade</p>
        <h1>Agenda academica com sincronizacao opcional ao Google Calendar</h1>
        <p>
          A Agenda Faculdade ajuda alunos e administradores a organizar provas e trabalhos em uma agenda compartilhada. Administradores cadastram datas
          academicas; membros visualizam a agenda e podem conectar a propria conta Google para receber esses compromissos no Google Calendar.
        </p>
        <h2>Como o app usa o Google Calendar</h2>
        <p>
          Quando o usuario conecta o Google Calendar, o app cria, atualiza e remove apenas eventos academicos gerados pela Agenda Faculdade no calendario
          principal da conta conectada. Os eventos usam lembretes do proprio Google Calendar: email 7 dias antes, email 1 dia antes e notificacao 1 dia antes.
        </p>
        <h2>Dados usados</h2>
        <p>
          O app usa nome, email e identificador da conta Google para login. Para sincronizacao, armazena um token OAuth criptografado e o identificador dos
          eventos criados no Google Calendar. A Agenda Faculdade nao vende dados pessoais e nao exibe eventos pessoais existentes do usuario.
        </p>
        <nav className="legal-links" aria-label="Links legais">
          <Link href="/">Entrar no app</Link>
          <Link href="/privacidade">Politica de Privacidade</Link>
          <Link href="/termos">Termos de Uso</Link>
        </nav>
      </section>
    </main>
  );
}
