---
date: 2026-06-22
title: Modernizar tela de login (/signin) com layout split e efeitos visuais
---

# Plano: Modernização da tela de login (/signin)

## Visão geral

Transformar a tela de login atual (card centralizado simples `max-w-lg`) em uma tela moderna com **layout split** — imagem/branding à esquerda, formulário à direita — com efeitos visuais de movimento, transições e elementos tecnológicos animados.

## Arquivos a modificar

| Arquivo | Ação |
|---------|------|
| `apps/remix/app/routes/_unauthenticated+/signin.tsx` | Refatorar para layout split 50/50 |
| `apps/remix/app/components/forms/signin.tsx` | Adaptar estilos do formulário (glassmorphism + animações) |
| `apps/remix/app/routes/_unauthenticated+/_layout.tsx` | Simplificar layout wrapper (remover pattern de fundo global) |
| `apps/remix/app/components/signin-hero.tsx` | **Novo** — componente do hero/branding do lado esquerdo |

## Etapa 1: Layout split — estrutura HTML/Tailwind

### Mudanças no `_layout.tsx`

Remover o layout centralizado com pattern de fundo e substituir por um wrapper flex minimalista:

```tsx
// Antes: layout centralizado com background pattern
<main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-12 md:p-12 lg:p-24">
  <div>
    <div className="absolute -inset-[min(600px,max(400px,60vw))] ...">
      <img src={backgroundPattern} ... />
    </div>
    <div className="relative w-full">
      <Outlet />
    </div>
  </div>
</main>

// Depois: wrapper flex simples
<main className="flex min-h-screen overflow-hidden bg-background">
  <Outlet />
</main>
```

### Mudanças no `signin.tsx` (route)

Estrutura split completa:

```tsx
<div className="flex min-h-screen w-full">
  {/* Lado esquerdo — hero/branding (oculto em mobile) */}
  <SignInHero />

  {/* Lado direito — formulário */}
  <div className="flex w-full items-center justify-center px-4 py-12 lg:w-1/2 lg:px-12 xl:px-16">
    <div className="w-full max-w-md space-y-8">
      {/* Logo (visível só em mobile) */}
      <div className="lg:hidden">...</div>

      {/* Card glassmorphism com formulário */}
      <SignInForm ... />
    </div>
  </div>
</div>
```

**Responsivo:**
- `< lg` (mobile/tablet): Layout vertical — hero oculto, formulário full-width
- `≥ lg` (desktop): Layout horizontal 50/50 split

## Etapa 2: Componente `SignInHero` (lado esquerdo)

Novo arquivo: `apps/remix/app/components/signin-hero.tsx`

### Conteúdo do hero:

1. **Background gradiente animado** — gradiente que transiciona entre as cores do tema (teal/cyan → azul escuro → roxo)
2. **Logo** — `logotipo2.png` centralizado com efeito de glow suave
3. **Textos de marca** com animação de entrada:
   - Título: `msg\`Welcome to BchatSign\``
   - Subtítulo: `msg\`Intelligent and secure digital signatures\``
4. **Ícones decorativos flutuantes** — ícones de documento, lápis, escudo animados com CSS keyframes
5. **Grid de dots sutil** — padrão pontilhado semi-transparente no fundo

### Animações CSS (sem lib extra):

```css
/* Gradiente animado de fundo */
@keyframes gradientShift {
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
}

.hero-gradient {
  background: linear-gradient(
    135deg,
    hsl(178 80% 40%),
    hsl(222 47% 12%),
    hsl(199 89% 38%)
  );
  background-size: 400% 400%;
  animation: gradientShift 15s ease infinite;
}

/* Elementos flutuantes */
@keyframes float {
  0%, 100% { transform: translateY(0) rotate(0deg); }
  33% { transform: translateY(-20px) rotate(5deg); }
  66% { transform: translateY(10px) rotate(-3deg); }
}

@keyframes floatSlow {
  0%, 100% { transform: translateY(0) scale(1); }
  50% { transform: translateY(-15px) scale(1.05); }
}
```

### Framer Motion no hero:

```tsx
// Fade-in escalonado dos elementos do hero
const heroVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.3 }
  },
};

const heroItemVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
};
```

## Etapa 3: Formulário — glassmorphism + animações de entrada

### Card glassmorphism:

```tsx
<div className="
  rounded-2xl border border-border/50 bg-card/80 p-8
  backdrop-blur-xl shadow-lg
  dark:bg-card/60 dark:border-border/30
">
```

### Animações de entrada com Framer Motion:

```tsx
const formContainerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.15 },
  },
};

const formItemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};
```

### Melhorias visuais nos campos:

- **Input focus glow**: Borda com `ring` animado na cor `--primary` (já existe no design system)
- **Botão submit**: Efeito de loading com spinner animado (já usa `loading` prop)
- **Divider "Or continue with"**: Linha com transição de opacidade
- **Botões SSO**: Hover com `transition: transform 150ms ease` (scale 1.01)
- **Links**: Transição de cor suave (`transition: opacity 200ms`)

## Etapa 4: Micro-interações e detalhes

1. **Logo animado** — aparece com efeito scale de 0.8→1 no carregamento
2. **Ícones nos inputs** — Lucide icons com fade-in alongside labels
3. **Partículas decorativas no hero** — 5-8 círculos pequenos animados com CSS
4. **Mouse parallax no hero** (opcional) — `useMotionValue` do Framer Motion para efeito sutil
5. **Animação de erro** — shake sutil via Framer Motion quando toast aparece
6. **Transição de estados** — suave entre loading/normal/error

## Etapa 5: Responsividade

| Breakpoint | Comportamento |
|------------|---------------|
| `< lg` (mobile) | Layout vertical — hero oculto, formulário full-width com padding |
| `≥ lg` (desktop) | Layout horizontal 50/50 split |
| `≥ xl` | Hero pode ter conteúdo mais expandido, formulário com mais respiro |

## Dependências

- **Framer Motion** (`framer-motion@^12.23.24`): ✅ Já instalado
- **Lucide React** (`lucide-react@^0.554.0`): ✅ Já instalado
- **Tailwind CSS** (`tailwindcss@^3.4.18`): ✅ Já instalado
- **Nenhuma nova dependência necessária** 🎉

## Riscos e Mitigações

1. **Compatibilidade com embeds**: `SignInForm` é usado em `embed-authentication-required.tsx`. A mudança é APENAS na route page (`signin.tsx`), não no componente de form.
2. **Org signin** (`o.$orgUrl.signin.tsx`): Decidir se aplicar o mesmo layout. Recomendação: manter o layout split apenas no `/signin` principal por enquanto.
3. **Dark mode**: Gradiente e glassmorphism precisam de variantes `dark:` adequadas.
4. **Performance**: Animações CSS são leves. Framer Motion já está no bundle.
5. **Acessibilidade**: Respeitar `prefers-reduced-motion` — desabilitar animações CSS e usar `initial={false}` no Framer Motion quando detectado.
6. **i18n**: Todos os textos novos devem usar `<Trans>` ou `msg\`` para tradução.

## Sequência de implementação

1. ✅ Criar `SignInHero` componente (lado esquerdo com gradient + logo + textos + partículas)
2. ✅ Modificar `_layout.tsx` — simplificar wrapper
3. ✅ Refatorar `signin.tsx` route com estrutura split 50/50
4. ✅ Adaptar `SignInForm` — glassmorphism card + Framer Motion staggered entrance
5. ✅ Adicionar animações CSS (gradient, float, particles)
6. ✅ Testar responsividade em todos os breakpoints
7. ✅ Testar dark mode
8. ✅ Verificar que embeds ainda funcionam (`SignInForm` isolado)
9. ✅ Typecheck: `npx tsc --noEmit -p apps/remix`

## Notas de design

- **Cores do tema**: `--primary: 178 80% 40%` (teal) e `--background` (slate)
- **Design system**: Usar primitivas existentes (Button, Input, etc.)
- **i18n**: Manter `<Trans>` e `msg\`` para todos os textos
- **Logo**: Usar `logotipo2.png` (já disponível em `packages/assets/`)
- **Padrão visual**: Inspirado em Linear, Vercel, Clerk — limpo, tecnológico, com profundidade
