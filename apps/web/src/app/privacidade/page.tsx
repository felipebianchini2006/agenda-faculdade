import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacidade - Agenda Faculdade",
  description: "Politica de privacidade da Agenda Faculdade e uso de dados do Google.",
};

export default function PrivacidadePage() {
  return (
    <main className="legal-page">
      <article className="legal-card">
        <p className="section-kicker">Politica de Privacidade</p>
        <h1>Privacidade da Agenda Faculdade</h1>
        <p className="muted-text">Ultima atualizacao: 15 de maio de 2026.</p>

        <h2>Dados coletados</h2>
        <p>
          Coletamos nome, email, foto de perfil quando disponivel, identificador da conta Google, funcao de acesso no app, status da conta e sessoes de login.
          Quando o usuario conecta o Google Calendar, armazenamos um token OAuth criptografado e dados tecnicos de sincronizacao dos eventos academicos.
        </p>

        <h2>Uso de dados do Google</h2>
        <p>
          Usamos dados do Google somente para autenticar o usuario e, quando autorizado, criar, atualizar e remover eventos academicos da Agenda Faculdade no
          Google Calendar do proprio usuario. O app nao vende, compartilha para publicidade, nem usa dados do Google para treinamento de modelos.
        </p>

        <h2>Escopo do Google Calendar</h2>
        <p>
          A Agenda Faculdade solicita permissao de eventos em calendarios pertencentes ao usuario para gravar provas e trabalhos. O app nao lista nem exibe no
          produto os eventos pessoais existentes do usuario.
        </p>

        <h2>Armazenamento e seguranca</h2>
        <p>
          Os tokens de sincronizacao sao armazenados criptografados no servidor. As sessoes usam cookies HTTP-only. O acesso administrativo e restrito a usuarios
          autorizados.
        </p>

        <h2>Controle do usuario</h2>
        <p>
          O usuario pode desconectar o Google Calendar na tela Perfil. Tambem pode revogar o acesso pela pagina de seguranca da propria Conta Google. Contas e
          dados podem ser removidos mediante solicitacao ao responsavel do dominio.
        </p>

        <h2>Contato</h2>
        <p>Para solicitacoes de privacidade, remocao de dados ou suporte, entre em contato pelo email felipebianchini02@gmail.com.</p>

        <nav className="legal-links" aria-label="Links legais">
          <Link href="/sobre">Sobre</Link>
          <Link href="/termos">Termos de Uso</Link>
          <Link href="/">Entrar no app</Link>
        </nav>
      </article>
    </main>
  );
}
