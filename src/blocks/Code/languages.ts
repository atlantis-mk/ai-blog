export const codeBlockLanguages = {
  abap: 'ABAP',
  apex: 'Apex',
  azcli: 'Azure CLI',
  bash: 'Bash',
  bat: 'Batch',
  bicep: 'Bicep',
  cameligo: 'CameLIGO',
  clojure: 'Clojure',
  coffee: 'CoffeeScript',
  cpp: 'C++',
  csharp: 'C#',
  csp: 'CSP',
  css: 'CSS',
  cypher: 'Cypher',
  dart: 'Dart',
  diff: 'Diff',
  dockerfile: 'Dockerfile',
  ecl: 'ECL',
  elixir: 'Elixir',
  flow9: 'Flow9',
  freemarker2: 'FreeMarker 2',
  fsharp: 'F#',
  go: 'Go',
  graphql: 'GraphQL',
  handlebars: 'Handlebars',
  hcl: 'HCL',
  html: 'HTML',
  ini: 'INI',
  java: 'Java',
  javascript: 'JavaScript',
  json: 'JSON',
  julia: 'Julia',
  kotlin: 'Kotlin',
  less: 'Less',
  lexon: 'Lexon',
  liquid: 'Liquid',
  lua: 'Lua',
  m3: 'M3',
  markdown: 'Markdown',
  mdx: 'MDX',
  mips: 'MIPS',
  msdax: 'DAX',
  mysql: 'MySQL',
  objectivec: 'Objective-C',
  pascal: 'Pascal',
  pascaligo: 'PascaLIGO',
  perl: 'Perl',
  pgsql: 'PostgreSQL',
  php: 'PHP',
  pla: 'PLA',
  postiats: 'Postiats',
  powerquery: 'Power Query',
  powershell: 'PowerShell',
  protobuf: 'Protobuf',
  pug: 'Pug',
  python: 'Python',
  qsharp: 'Q#',
  r: 'R',
  razor: 'Razor',
  redis: 'Redis',
  redshift: 'Amazon Redshift',
  restructuredtext: 'reStructuredText',
  ruby: 'Ruby',
  rust: 'Rust',
  sb: 'Small Basic',
  scala: 'Scala',
  scheme: 'Scheme',
  scss: 'SCSS',
  solidity: 'Solidity',
  sophia: 'Sophia',
  sparql: 'SPARQL',
  sql: 'SQL',
  st: 'Structured Text',
  swift: 'Swift',
  systemverilog: 'SystemVerilog',
  tcl: 'Tcl',
  text: 'Plain Text',
  twig: 'Twig',
  typescript: 'TypeScript',
  typespec: 'TypeSpec',
  vb: 'Visual Basic',
  wgsl: 'WGSL',
  xml: 'XML',
  yaml: 'YAML',
} as const

export type CodeBlockLanguage = keyof typeof codeBlockLanguages

const languageAliases: Record<string, CodeBlockLanguage> = {
  'c#': 'csharp',
  'c++': 'cpp',
  'objective-c': 'objectivec',
  c: 'cpp',
  cs: 'csharp',
  docker: 'dockerfile',
  golang: 'go',
  js: 'javascript',
  json5: 'json',
  jsonc: 'json',
  jsx: 'javascript',
  md: 'markdown',
  objc: 'objectivec',
  plain: 'text',
  plaintext: 'text',
  ps1: 'powershell',
  py: 'python',
  rb: 'ruby',
  rs: 'rust',
  sh: 'bash',
  shell: 'bash',
  ts: 'typescript',
  tsx: 'typescript',
  txt: 'text',
  vue: 'html',
  yml: 'yaml',
  zsh: 'bash',
}

export const normalizeCodeBlockLanguage = (value?: string | null): CodeBlockLanguage => {
  let language = value?.trim().split(/\s+/, 1)[0]?.toLowerCase() || 'text'

  language = language.replace(/^\{/, '').replace(/\}$/, '')
  language = language.replace(/^\./, '').replace(/^language-/, '')

  const alias = languageAliases[language]
  if (alias) return alias

  return Object.prototype.hasOwnProperty.call(codeBlockLanguages, language)
    ? (language as CodeBlockLanguage)
    : 'text'
}

export const normalizeMarkdownCodeFenceLanguages = (markdown: string): string => {
  let insideFence = false

  return markdown
    .split('\n')
    .map((line) => {
      if (insideFence) {
        if (/^[ \t]{0,3}```[ \t]*\r?$/.test(line)) insideFence = false
        return line
      }

      // Payload's converter accepts triple-backtick fences and a single language token.
      const openingFence = line.match(/^([ \t]{0,3})```([^`\r\n]*)\r?$/)
      if (!openingFence) return line

      insideFence = true
      return `${openingFence[1]}\`\`\`${normalizeCodeBlockLanguage(openingFence[2])}`
    })
    .join('\n')
}
