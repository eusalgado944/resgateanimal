import { useEffect, useRef, useState } from 'react'
import { getToken, listFrom, request, safeImage, saveToken } from './api'

const labels = {
  dog: 'Cachorro', cat: 'Gato', male: 'Macho', female: 'Fêmea',
  small: 'Pequeno', medium: 'Médio', large: 'Grande',
  available: 'Para adoção', adopted: 'Adotado', pending: 'Em análise', approved: 'Aprovada',
  rejected: 'Não aprovada', new: 'Nova', read: 'Lida', archived: 'Arquivada', unavailable: 'Indisponível',
  contact: 'Contato', volunteer: 'Voluntariado', donation: 'Doação', abuse: 'Relato de animal em risco',
}
const label = (value) => labels[value] || value || 'Não informado'
const currentYear = new Date().getFullYear()

function Icon({ name = 'paw', size = 22, ...props }) {
  const paths = {
    heart: <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z" />,
    arrow: <><path d="M4 12h16M14 6l6 6-6 6" /></>,
    check: <path d="m5 12 4 4L19 6" />,
    menu: <path d="M4 6h16M4 12h16M4 18h16" />,
    close: <path d="m6 6 12 12M6 18 18 6" />,
    search: <><circle cx="10" cy="10" r="6" /><path d="m15 15 6 6" /></>,
    mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 6 9 7 9-7" /></>,
    shield: <><path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z" /><path d="m8 12 3 3 5-6" /></>,
    plus: <path d="M12 4v16M4 12h16" />,
    paw: <><ellipse cx="8" cy="6" rx="2" ry="3" /><ellipse cx="16" cy="6" rx="2" ry="3" /><ellipse cx="3.5" cy="11" rx="1.8" ry="2.5" /><ellipse cx="20.5" cy="11" rx="1.8" ry="2.5" /><path d="M6 19c-2-3 3-8 6-8s8 5 6 8c-2 2-4 0-6 0s-4 2-6 0Z" /></>,
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[name] || paths.paw}</svg>
}

function useResource(path, token = '', refresh = 0) {
  const key = `${path}:${token}:${refresh}`
  const [state, setState] = useState({ key: null, data: null, loading: true, error: '' })
  useEffect(() => {
    const controller = new AbortController()
    request(path, { token, signal: controller.signal })
      .then(data => setState({ key, data, loading: false, error: '' }))
      .catch(error => {
        if (error.name !== 'AbortError') setState({ key, data: null, loading: false, error: error.message, status: error.status })
      })
    return () => controller.abort()
  }, [path, token, refresh, key])
  return state.key === key ? state : { data: null, loading: true, error: '' }
}

function Notice({ children, error = false }) {
  return <div className={`notice ${error ? 'notice-error' : ''}`} role={error ? 'alert' : 'status'}><Icon name={error ? 'mail' : 'check'} /> <span>{children}</span></div>
}

function Loading() {
  return <div className="loading" role="status"><span className="spinner" /> Buscando informações…</div>
}

function Empty({ title = 'Nenhum resultado por aqui', children }) {
  return <div className="empty"><span className="empty-icon"><Icon size={36} /></span><h3>{title}</h3><p>{children}</p></div>
}

function Field({ label: text, name, children, hint, ...props }) {
  return <label className={`field ${props.className || ''}`}><span>{text}{props.required && <span className="required"> *</span>}</span>{children || <input name={name} {...props} pattern={name === 'phone' ? String.raw`[+0-9 \(\)\.\-]+` : props.pattern} minLength={props.minLength ?? (['name', 'city'].includes(name) ? 2 : name === 'phone' ? 6 : undefined)} />}{hint && <small>{hint}</small>}</label>
}

function Header({ route }) {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const close = () => setOpen(false)
    window.addEventListener('hashchange', close)
    return () => window.removeEventListener('hashchange', close)
  }, [])
  return <header className="site-header"><div className="container header-inner">
    <a className="brand" href="#/" aria-label="Resgate Animal — início"><span className="brand-mark"><Icon size={30} /></span><span>Resgate Animal<small>ASSOCIAÇÃO FOCINHO AMIGO</small></span></a>
    <button className="menu-button" aria-label={open ? 'Fechar menu' : 'Abrir menu'} aria-expanded={open} onClick={() => setOpen(!open)}><Icon name={open ? 'close' : 'menu'} /></button>
    <nav className={open ? 'nav-open' : ''} aria-label="Navegação principal" onClick={event => { if (event.target.closest('a')) setOpen(false) }}>
      <a href="#/" aria-current={route === '/' ? 'page' : undefined}>Início</a>
      <a href="#/animais" aria-current={route.startsWith('/animais') ? 'page' : undefined}>Quero adotar</a>
      <a href="#/ajudar" aria-current={route === '/ajudar' ? 'page' : undefined}>Como ajudar</a>
      <a href="#/contato" aria-current={route === '/contato' ? 'page' : undefined}>Contato</a>
      <a className="button button-small" href="#/ajudar?tipo=donation"><Icon name="heart" size={17} /> Faça parte</a>
    </nav>
  </div></header>
}

function Footer() {
  return <footer><div className="container footer-top"><div><a className="brand" href="#/"><span className="brand-mark"><Icon size={27} /></span><span>Resgate Animal<small>ASSOCIAÇÃO FOCINHO AMIGO</small></span></a><p>Cada focinho tem uma história.<br />Juntos, podemos mudar o final.</p></div><div><h3>Encontre seu caminho</h3><a href="#/animais">Adote um amigo</a><a href="#/ajudar">Seja voluntário ou apoiador</a><a href="#/contato?tipo=report">Relate um animal em risco</a></div><div><h3>Vamos conversar?</h3><a href="#/contato"><Icon name="mail" size={17} /> Envie uma mensagem</a><span>O cuidado começa com a escuta.</span><a href="#/admin" className="admin-link"><Icon name="shield" size={16} /> Área da equipe</a></div></div><div className="container footer-bottom"><span>© {currentYear} Associação Focinho Amigo</span><span>Associação fictícia · Projeto demonstrativo · Não atende emergências</span></div></footer>
}

function AnimalCard({ animal }) {
  return <article className="animal-card"><a href={`#/animais/${animal.id}`} className="animal-image-link" aria-label={`Conhecer ${animal.name}`}><img src={safeImage(animal.photoUrl)} alt={animal.name} loading="lazy" onError={e => { e.currentTarget.src = '/animal-placeholder.svg' }} /><span className="pill image-pill">{label(animal.species)}</span></a><div className="animal-card-body"><div className="animal-card-heading"><h3><a href={`#/animais/${animal.id}`}>{animal.name}</a></h3><Icon name="heart" /></div><p>{animal.age || 'Idade não informada'} <span>·</span> {label(animal.sex)} <span>·</span> {label(animal.size)}</p><a className="text-link" href={`#/animais/${animal.id}`}>Quero conhecer <Icon name="arrow" size={18} /></a></div></article>
}

function Home() {
  const [refresh, setRefresh] = useState(0)
  const { data, loading, error } = useResource('/animals?limit=3', '', refresh)
  const animals = listFrom(data, 'animals').slice(0, 3)
  return <>
    <section className="hero"><div className="container hero-grid"><div className="hero-copy"><span className="eyebrow"><span className="tiny-dot" /> Pequenos gestos. Novos começos.</span><h1>O amor tem<br />quatro patas.<span>E espera por você.</span></h1><p>Uma casa, um abraço, uma segunda chance. Conectamos animais resgatados a pessoas prontas para escrever uma nova história.</p><div className="hero-actions"><a className="button" href="#/animais">Encontre seu novo amigo <Icon name="arrow" size={19} /></a><a className="button button-outline" href="#/ajudar">Quero ajudar</a></div><div className="hero-note"><span className="mini-heart"><Icon name="heart" size={17} /></span><span>Adoção responsável. Amor para a vida toda.</span></div></div><div className="hero-art"><img src="/hero-friends.svg" alt="Ilustração de um cachorro e um gato lado a lado, prontos para um novo lar" /><div className="hero-badge"><span><Icon name="heart" size={25} /></span><div>Um lar muda tudo.<small>Inclusive a sua vida.</small></div></div><span className="art-caption">MAIS AMOR. MENOS ABANDONO.</span></div></div></section>
    <section className="values-strip"><div className="container values-grid"><div><Icon name="shield" size={27} /><span><strong>Adoção com cuidado</strong><small>Um encontro pensado para durar</small></span></div><div><Icon name="heart" size={27} /><span><strong>Resgate com propósito</strong><small>Cada vida importa de verdade</small></span></div><div><Icon size={27} /><span><strong>Uma comunidade que acolhe</strong><small>Você também pode fazer parte</small></span></div></div></section>
    <section className="section container"><div className="section-heading"><div><span className="eyebrow">ENCONTROS QUE TRANSFORMAM</span><h2>Seu melhor amigo pode estar aqui.</h2><p>Conheça algumas patinhas à espera de uma família.</p></div><a className="text-link" href="#/animais">Ver todos os animais <Icon name="arrow" size={19} /></a></div>{loading ? <Loading /> : error ? <><Notice error>{error}</Notice><button className="button button-outline retry" onClick={() => setRefresh(refresh + 1)}>Tentar novamente</button></> : animals.length ? <div className="animal-grid">{animals.map(animal => <AnimalCard key={animal.id} animal={animal} />)}</div> : <Empty title="Novas histórias estão chegando">Ainda não há animais disponíveis. Você pode ajudar de outras formas enquanto espera.</Empty>}</section>
    <section className="section story-section"><div className="container story-grid"><div className="story-art"><Icon size={90} /><span>Por um mundo onde<br />todo focinho tenha um lar.</span><div className="story-label">Focinho Amigo ♡</div></div><div><span className="eyebrow">NOSSA RAZÃO DE EXISTIR</span><h2>Não é só sobre resgatar.<br />É sobre recomeçar.</h2><p>A Associação Focinho Amigo é uma organização fictícia dedicada ao acolhimento, à recuperação e à adoção responsável de animais.</p><p>Acreditamos que o cuidado se constrói em comunidade. Com tempo, apoio e afeto, cada um de nós pode abrir caminho para uma vida melhor.</p><a className="text-link" href="#/ajudar">Descubra como fazer a diferença <Icon name="arrow" size={18} /></a></div></div></section>
    <section className="container section"><div className="help-banner"><div><span className="eyebrow">NÃO PODE ADOTAR AGORA?</span><h2>Há muitas formas de oferecer amor.</h2><p>Doe, seja voluntário ou ajude a compartilhar essas histórias.</p></div><a className="button button-light" href="#/ajudar">Quero fazer parte <Icon name="heart" size={18} /></a></div></section>
  </>
}

function Gallery() {
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [size, setSize] = useState('')
  const [page, setPage] = useState(0)
  const [refresh, setRefresh] = useState(0)
  const params = new URLSearchParams({ limit: '12', offset: String(page * 12) })
  if (filter !== 'all') params.set('species', filter)
  if (size) params.set('size', size)
  if (search.trim()) params.set('search', search.trim())
  const { data, loading, error } = useResource(`/animals?${params}`, '', refresh)
  const animals = listFrom(data, 'animals')
  const total = data?.total ?? animals.length
  const hasFilters = filter !== 'all' || size || search.trim()
  return <main id="main" className="container section"><div className="page-heading"><span className="eyebrow">UM ENCONTRO. UMA NOVA HISTÓRIA.</span><h1>Encontre seu novo amigo.</h1><p>Cada um tem seu jeitinho. Todos têm muito amor para dar.</p></div><div className="filters"><div className="filter-tabs" aria-label="Filtrar por espécie">{[['all', 'Todos'], ['dog', 'Cachorros'], ['cat', 'Gatos']].map(([value, text]) => <button key={value} className={filter === value ? 'active' : ''} onClick={() => { setFilter(value); setPage(0) }} aria-pressed={filter === value}>{text}</button>)}</div><div className="filter-inputs"><label className="search-field"><Icon name="search" size={18} /><input aria-label="Buscar animal por nome" placeholder="Busque um nome…" maxLength={120} value={search} onChange={e => { setSearch(e.target.value); setPage(0) }} /></label><select aria-label="Filtrar por porte" value={size} onChange={e => { setSize(e.target.value); setPage(0) }}><option value="">Todos os portes</option><option value="small">Pequeno</option><option value="medium">Médio</option><option value="large">Grande</option></select></div></div>{loading ? <Loading /> : error ? <><Notice error>{error}</Notice><button className="button button-outline retry" onClick={() => setRefresh(refresh + 1)}>Tentar novamente</button></> : <><p className="result-count" aria-live="polite">{total} {total === 1 ? 'amigo esperando' : 'amigos esperando'} por um lar</p>{animals.length ? <div className="animal-grid">{animals.map(animal => <AnimalCard key={animal.id} animal={animal} />)}</div> : <Empty title={hasFilters ? 'Não encontramos esse amigo' : 'Novos amigos estão chegando'}>{hasFilters ? 'Tente outro nome ou altere os filtros para conhecer mais animais.' : 'Ainda não há animais para adoção. Volte em breve ou conheça outras formas de ajudar.'}</Empty>}<Pagination page={page} total={total} limit={12} onChange={setPage} /></>}<div className="adoption-note"><Icon name="shield" /><p><strong>Adotar é um compromisso para a vida toda.</strong> Nosso processo inclui análise da candidatura e conversa com a equipe para um encontro seguro e responsável.</p></div></main>
}

function Pagination({ page, total, limit, onChange }) {
  if (total <= limit && page === 0) return null
  return <div className="pagination" role="group" aria-label="Paginação de resultados"><button className="button button-outline button-small" disabled={page === 0} onClick={() => onChange(page - 1)}>← Anterior</button><span>Página {page + 1} de {Math.max(1, Math.ceil(total / limit))}</span><button className="button button-outline button-small" disabled={(page + 1) * limit >= total} onClick={() => onChange(page + 1)}>Próxima →</button></div>
}

function AdoptionForm({ animal }) {
  const [state, setState] = useState({ busy: false, error: '', done: false })
  async function submit(event) {
    event.preventDefault()
    const form = event.currentTarget
    const values = Object.fromEntries(new FormData(form))
    setState({ busy: true, error: '', done: false })
    try {
      await request('/applications', { method: 'POST', body: { ...values, animalId: animal.id } })
      setState({ busy: false, error: '', done: true })
    } catch (error) { setState({ busy: false, error: error.message, done: false }) }
  }
  if (state.done) return <div className="success-card"><span className="empty-icon"><Icon name="check" size={35} /></span><h3>Candidatura recebida com carinho!</h3><p>A equipe analisará suas informações e entrará em contato. O envio não garante a adoção: é o primeiro passo de uma conversa.</p><a href="#/animais" className="button button-outline">Conhecer outros amigos</a></div>
  return <form onSubmit={submit} className="form-stack"><h2>Vamos começar essa história?</h2><p>Conte um pouco sobre você e o lar que deseja oferecer a {animal.name}.</p><div className="form-grid"><Field label="Nome completo" name="name" required maxLength={120} autoComplete="name" /><Field label="E-mail" name="email" type="email" required maxLength={254} autoComplete="email" /><Field label="Telefone / WhatsApp" name="phone" type="tel" required maxLength={30} autoComplete="tel" /><Field label="Cidade e estado" name="city" required maxLength={120} autoComplete="address-level2" /></div><Field label="Como será a vida desse amigo com você?" name="message" required><textarea name="message" required rows={5} minLength={10} maxLength={3000} placeholder="Conte sobre sua casa, rotina, outros animais e experiência com cuidados…" /></Field><label className="checkbox-label"><input type="checkbox" required /><span>Tenho 18 anos ou mais e entendo a responsabilidade de adotar. Autorizo o uso dos dados enviados para avaliar esta candidatura e entrar em contato.</span></label>{state.error && <Notice error>{state.error}</Notice>}<button className="button" disabled={state.busy}>{state.busy ? 'Enviando candidatura…' : 'Enviar candidatura'}<Icon name="heart" size={18} /></button><small className="muted">Seus dados são usados apenas neste processo de atendimento. Projeto demonstrativo: não envie informações sensíveis.</small></form>
}

function AnimalDetail({ id }) {
  const [refresh, setRefresh] = useState(0)
  const { data, loading, error } = useResource(`/animals/${encodeURIComponent(id)}`, '', refresh)
  const animal = data?.animal || data
  return <main id="main" className="container section"><a className="back-link" href="#/animais">← Voltar para todos os animais</a>{loading ? <Loading /> : error ? <><Notice error>{error}</Notice><button className="button button-outline retry" onClick={() => setRefresh(refresh + 1)}>Tentar novamente</button></> : animal && <><div className="detail-grid"><div><img className="detail-image" src={safeImage(animal.photoUrl)} alt={animal.name} onError={e => { e.currentTarget.src = '/animal-placeholder.svg' }} /></div><div className="detail-copy"><span className="pill">{label(animal.status)}</span><h1>Oi, eu sou {animal.name}!</h1><p className="detail-subtitle">Será que a nossa história começa aqui?</p><div className="facts">{[['Espécie', animal.species], ['Sexo', animal.sex], ['Porte', animal.size], ['Idade', animal.age]].map(([key, value]) => <div key={key}><small>{key}</small><strong>{label(value)}</strong></div>)}</div><h3>Um pouquinho sobre mim</h3><p className="preserve-lines">{animal.description || 'A equipe pode contar mais sobre este amigo. Entre em contato para conhecê-lo melhor.'}</p><p><strong>Raça:</strong> {animal.breed || 'Sem raça definida'}</p>{animal.status === 'available' ? <a className="button" href="#candidatura" onClick={e => { e.preventDefault(); document.getElementById('candidatura')?.scrollIntoView({ behavior: 'smooth' }); document.querySelector('#candidatura input')?.focus({ preventScroll: true }) }}>Quero adotar {animal.name}<Icon name="heart" size={18} /></a> : <Notice>Este amigo não está disponível para novas candidaturas.</Notice>}</div></div>{animal.status === 'available' && <section id="candidatura" className="application-panel"><div className="application-aside"><span className="eyebrow">ADOÇÃO RESPONSÁVEL</span><h2>Um lar não é só um lugar.<br />É uma promessa.</h2><ol><li><span>1</span><div><strong>Conte sua história</strong><p>Preencha a candidatura com atenção.</p></div></li><li><span>2</span><div><strong>Vamos conversar</strong><p>A equipe avalia o perfil e entra em contato.</p></div></li><li><span>3</span><div><strong>Um encontro especial</strong><p>Combinamos os próximos passos juntos.</p></div></li></ol></div><AdoptionForm animal={animal} /></section>}</>}</main>
}

function Inquiry({ initialType = 'contact' }) {
  const [type, setType] = useState(initialType)
  const [state, setState] = useState({ busy: false, error: '', done: false })
  async function submit(event) {
    event.preventDefault()
    const form = event.currentTarget
    const values = Object.fromEntries(new FormData(form))
    setState({ busy: true, error: '', done: false })
    try {
      const body = { type, name: values.name, email: values.email, message: values.message }
      if (values.phone) body.phone = values.phone
      if (type === 'abuse') body.address = values.address
      await request('/messages', { method: 'POST', body })
      form.reset()
      setState({ busy: false, error: '', done: true })
    } catch (error) { setState({ busy: false, error: error.message, done: false }) }
  }
  return <div className="inquiry-panel"><div className="inquiry-aside"><span className="eyebrow">O PRIMEIRO PASSO É CONVERSAR</span><h2>Seu cuidado pode<br />mudar uma vida.</h2><p>Escolha como quer participar e envie sua mensagem. Nossa equipe dará continuidade ao atendimento.</p><div className="inquiry-note"><Icon name="shield" size={26} /><p><strong>Transparência em primeiro lugar.</strong><br />Esta associação é fictícia. Não coletamos pagamentos, não fornecemos chaves PIX e não atendemos emergências.</p></div><p className="muted">Em risco imediato, procure os serviços de emergência ou proteção animal da sua região.</p></div><form onSubmit={submit} className="form-stack"><h2>Vamos conversar?</h2><Field label="Como você quer ajudar?"><select value={type} disabled={state.busy} onChange={e => { setType(e.target.value); setState({ busy: false, error: '', done: false }) }}><option value="contact">Tenho uma dúvida / contato</option><option value="volunteer">Quero ser voluntário</option><option value="donation">Quero apoiar com uma doação</option><option value="abuse">Quero relatar um animal em risco</option></select></Field>{type === 'donation' && <div className="inline-info">Este formulário é uma intenção de apoio, não uma cobrança. Conte o que gostaria de doar (ração, materiais ou outro apoio).</div>}{type === 'abuse' && <div className="inline-info">Inclua a localização e a situação do animal. Este canal não é monitorado como serviço de emergência.</div>}<div className="form-grid"><Field label="Nome" name="name" required minLength={2} maxLength={120} autoComplete="name" /><Field label="E-mail" name="email" type="email" required maxLength={254} autoComplete="email" /><Field label="Telefone" name="phone" type="tel" minLength={6} maxLength={40} pattern="[+0-9 () .-]+" autoComplete="tel" /></div>{type === 'abuse' && <Field label="Localização do animal" name="address" required minLength={5} maxLength={300} placeholder="Cidade, bairro, rua e ponto de referência" />}<Field label="Sua mensagem" required><textarea name="message" required minLength={10} maxLength={5000} rows={5} placeholder={type === 'volunteer' ? 'Conte sobre suas habilidades, disponibilidade e vontade de ajudar…' : type === 'abuse' ? 'Descreva a situação e os cuidados de que o animal precisa…' : 'Como podemos ajudar?'} /></Field><label className="checkbox-label"><input type="checkbox" required /><span>Autorizo o uso dos dados enviados para responder a esta mensagem. Não envie documentos, dados financeiros ou informações sensíveis.</span></label>{state.error && <Notice error>{state.error}</Notice>}{state.done && <Notice>Mensagem recebida! A equipe poderá entrar em contato pelos dados informados.</Notice>}<button className="button" disabled={state.busy}>{state.busy ? 'Enviando…' : 'Enviar mensagem'}<Icon name="arrow" size={18} /></button></form></div>
}

function Help({ type = 'volunteer' }) {
  return <main id="main" className="container section"><div className="page-heading"><span className="eyebrow">JUNTOS, VAMOS MAIS LONGE</span><h1>Todo gesto encontra um focinho.</h1><p>Não precisa fazer tudo. Só precisa começar por alguma coisa.</p></div><div className="help-grid">{[{ icon: 'heart', title: 'Apoie o cuidado', text: 'Ração, materiais e recursos ajudam a transformar a rotina dos animais.', type: 'donation', cta: 'Quero apoiar' }, { icon: 'paw', title: 'Doe seu tempo', text: 'Passeios, acolhimento e suas habilidades podem fazer toda a diferença.', type: 'volunteer', cta: 'Quero ser voluntário' }, { icon: 'mail', title: 'Dê voz a uma história', text: 'Conhece um animal que precisa de ajuda? Compartilhe a situação com a equipe.', type: 'report', cta: 'Quero relatar' }].map(item => <article className="help-card" key={item.type}><span className="help-icon"><Icon name={item.icon} size={29} /></span><h3>{item.title}</h3><p>{item.text}</p><a className="text-link" href={`#/ajudar?tipo=${item.type}`}>{item.cta}<Icon name="arrow" size={17} /></a></article>)}</div><Inquiry key={type} initialType={type} /></main>
}

function Login({ onLogin }) {
  const [state, setState] = useState({ busy: false, error: '' })
  async function submit(event) {
    event.preventDefault()
    const body = Object.fromEntries(new FormData(event.currentTarget))
    setState({ busy: true, error: '' })
    try {
      const result = await request('/admin/login', { method: 'POST', body })
      if (!result.token) throw new Error('Não foi possível iniciar a sessão.')
      onLogin(result.token)
    } catch (error) { setState({ busy: false, error: error.message }) }
  }
  return <main id="main" className="container section login-wrap"><div className="login-card"><span className="empty-icon"><Icon name="shield" size={32} /></span><span className="eyebrow">ÁREA RESTRITA</span><h1>Olá, equipe!</h1><p>Entre para cuidar dos animais e dos novos encontros.</p><form onSubmit={submit} className="form-stack"><Field label="E-mail" name="email" required type="email" autoComplete="username" maxLength={254} /><Field label="Senha" name="password" required type="password" autoComplete="current-password" maxLength={200} />{state.error && <Notice error>{state.error}</Notice>}<button className="button" disabled={state.busy}>{state.busy ? 'Entrando…' : 'Entrar com segurança'}<Icon name="arrow" size={18} /></button></form><small>Sua sessão permanece apenas nesta aba.</small></div></main>
}

function AnimalEditor({ animal, token, onSaved, onCancel, onExpired }) {
  const [state, setState] = useState({ busy: false, error: '' })
  const [savedAnimal, setSavedAnimal] = useState(animal)
  const fileRef = useRef()
  async function submit(event) {
    event.preventDefault()
    const values = Object.fromEntries(new FormData(event.currentTarget))
    const file = fileRef.current.files[0]
    if (file && (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024)) {
      setState({ busy: false, error: 'Escolha uma imagem JPG, PNG ou WebP de até 5 MB.' })
      return
    }
    setState({ busy: true, error: '' })
    try {
      delete values.image
      const body = { ...values, featured: values.featured === 'on' }
      const result = await request(`/admin/animals${savedAnimal ? `/${savedAnimal.id}` : ''}`, {
        method: savedAnimal ? 'PATCH' : 'POST', token, body,
      })
      const record = result.animal
      setSavedAnimal(record)
      if (file) {
        const upload = new FormData()
        upload.append('photo', file)
        await request(`/admin/animals/${record.id}/photo`, { method: 'POST', body: upload, token })
      }
      onSaved()
    } catch (error) {
      if (error.status === 401) onExpired()
      setState({ busy: false, error: error.message })
    }
  }
  return <section className="editor-panel" aria-label={animal ? 'Editar animal' : 'Cadastrar animal'}>
    <div className="section-heading"><h2>{animal ? `Editar ${animal.name}` : 'Um novo amigo chegou'}</h2><button className="icon-button" onClick={onCancel} disabled={state.busy} aria-label="Fechar editor"><Icon name="close" /></button></div>
    <form onSubmit={submit} className="form-stack">
      <div className="form-grid">
        <Field label="Nome" name="name" required minLength={1} defaultValue={animal?.name || ''} maxLength={120} />
        <Field label="Idade" name="age" required defaultValue={animal?.age || ''} maxLength={80} placeholder="Ex.: 2 anos" />
        <Field label="Raça" name="breed" required defaultValue={animal?.breed || 'Sem raça definida'} maxLength={120} />
        <Field label="Espécie"><select name="species" defaultValue={animal?.species || 'dog'}><option value="dog">Cachorro</option><option value="cat">Gato</option></select></Field>
        <Field label="Sexo"><select name="sex" defaultValue={animal?.sex || 'female'}><option value="female">Fêmea</option><option value="male">Macho</option></select></Field>
        <Field label="Porte"><select name="size" defaultValue={animal?.size || 'medium'}><option value="small">Pequeno</option><option value="medium">Médio</option><option value="large">Grande</option></select></Field>
        <Field label="Situação"><select name="status" defaultValue={animal?.status || 'available'}><option value="available">Para adoção</option><option value="unavailable">Indisponível</option><option value="adopted">Adotado</option></select></Field>
      </div>
      <Field label="História e cuidados" required><textarea name="description" required maxLength={5000} rows={4} defaultValue={animal?.description || ''} /></Field>
      <div className="form-grid"><Field label="Foto do animal" hint="JPG, PNG ou WebP · até 5 MB. A foto substitui a anterior."><input ref={fileRef} name="image" type="file" accept="image/jpeg,image/png,image/webp" /></Field><div className="current-image"><img src={safeImage(savedAnimal?.photoUrl)} alt="Foto atual do animal" /></div></div>
      <label className="checkbox-label"><input name="featured" type="checkbox" defaultChecked={animal?.featured || false} /> Destacar na galeria</label>
      {state.error && <Notice error>{savedAnimal ? 'O cadastro está salvo. Não foi possível concluir a atualização da foto ou dos dados: ' : ''}{state.error}</Notice>}
      <div className="button-row"><button className="button" disabled={state.busy}>{state.busy ? 'Salvando…' : 'Salvar animal'}</button><button type="button" className="button button-outline" onClick={onCancel} disabled={state.busy}>Cancelar</button></div>
    </form>
  </section>
}

function Admin({ token, onLogout }) {
  const [tab, setTab] = useState('animals')
  const [refresh, setRefresh] = useState(0)
  const [editor, setEditor] = useState(null)
  const [notice, setNotice] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(null)
  const [selected, setSelected] = useState(null)
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(0)
  const params = new URLSearchParams({ limit: '24', offset: String(page * 24) })
  if (statusFilter && tab !== 'animals') params.set('status', statusFilter)
  const { data, loading, error: resourceError, status } = useResource(`/admin/${tab}?${params}`, token, refresh)
  const entries = listFrom(data, tab)
  useEffect(() => { if (status === 401) onLogout() }, [status, onLogout])
  function changeTab(value) { setTab(value); setEditor(null); setSelected(null); setNotice(''); setError(''); setStatusFilter(''); setPage(0) }
  async function mutate(path, method, body, message) {
    setBusy(path); setError(''); setNotice('')
    try {
      await request(path, { method, body, token })
      setNotice(message); setRefresh(r => r + 1); setSelected(null)
    } catch (failure) { if (failure.status === 401) onLogout(); else setError(failure.message) }
    finally { setBusy(null) }
  }
  return <main id="main" className="container section admin-main">
    <div className="section-heading"><div><span className="eyebrow">CUIDADO NOS BASTIDORES</span><h1>Painel da equipe</h1><p>Organize histórias, encontros e mensagens em um só lugar.</p></div><button className="button button-outline" onClick={onLogout}>Sair da conta</button></div>
    <div className="admin-tabs" role="group" aria-label="Seções administrativas">{[['animals', 'Animais', 'paw'], ['applications', 'Candidaturas', 'heart'], ['messages', 'Mensagens', 'mail']].map(([value, text, icon]) => <button aria-pressed={tab === value} key={value} className={tab === value ? 'active' : ''} onClick={() => changeTab(value)}><Icon name={icon} size={19} />{text}</button>)}</div>
    {notice && <Notice>{notice}</Notice>}
    {(error || resourceError) && <Notice error>{error || resourceError}</Notice>}
    {resourceError && <button className="button button-outline retry" onClick={() => setRefresh(refresh + 1)}>Tentar novamente</button>}
    {editor && <AnimalEditor key={editor.id || 'new'} animal={editor.id ? editor : null} token={token} onExpired={onLogout} onCancel={() => { setEditor(null); setRefresh(refresh + 1) }} onSaved={() => { setEditor(null); setNotice('Animal salvo com sucesso.'); setRefresh(refresh + 1); setPage(0) }} />}
    <div className="admin-toolbar"><h2>{{ animals: 'Animais acolhidos', applications: 'Candidaturas de adoção', messages: 'Caixa de mensagens' }[tab]}</h2><div className="button-row">
      {tab !== 'animals' && <select aria-label="Filtrar por situação" value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(0) }}><option value="">Todas as situações</option>{(tab === 'applications' ? ['pending', 'approved', 'rejected'] : ['new', 'read', 'archived']).map(value => <option key={value} value={value}>{label(value)}</option>)}</select>}
      {tab === 'animals' && <button className="button button-small" onClick={() => { setEditor({}); setNotice('') }}><Icon name="plus" size={18} /> Novo animal</button>}
    </div></div>
    {loading ? <Loading /> : !resourceError && <>
      {entries.length ? <div className="admin-list">{entries.map(item => <article className="admin-item" key={item.id}>
        {tab === 'animals' ? <>
          <img className="admin-thumbnail" src={safeImage(item.photoUrl)} alt={item.name} onError={e => { e.currentTarget.src = '/animal-placeholder.svg' }} />
          <div className="admin-item-copy"><h3>{item.name}</h3><p>{label(item.species)} · {item.age} · {label(item.size)}</p></div>
          <span className={`pill status-${item.status}`}>{label(item.status)}</span>
          <div className="button-row"><button className="button button-outline button-small" onClick={() => setEditor(item)}>Editar</button><button className="button button-danger button-small" disabled={!!busy} onClick={() => setSelected({ ...item, action: 'delete' })}>Excluir</button></div>
        </> : <>
          <span className="message-icon"><Icon name={tab === 'applications' ? 'heart' : 'mail'} /></span>
          <div className="admin-item-copy"><h3>{item.name}</h3><p>{tab === 'applications' ? `Interesse em ${item.animalName || 'animal removido do cadastro'}` : label(item.type)}</p><small>{item.createdAt ? new Date(item.createdAt).toLocaleDateString('pt-BR') : ''}</small></div>
          <span className={`pill status-${item.status}`}>{label(item.status)}</span>
          <button className="button button-outline button-small" onClick={() => setSelected(item)}>Analisar</button>
        </>}
      </article>)}</div> : <Empty title="Tudo em dia por aqui">{statusFilter ? 'Nenhum registro nesta situação. Experimente outro filtro.' : page ? 'Não há registros nesta página. Volte à página anterior.' : tab === 'animals' ? 'Cadastre o primeiro animal para começar a encontrar novos lares.' : 'Os novos atendimentos aparecerão aqui assim que forem enviados.'}</Empty>}
      <Pagination page={page} total={data?.total ?? entries.length} limit={24} onChange={setPage} />
    </>}
    {selected && <AdminDialog item={selected} tab={tab} busy={!!busy} error={error} onClose={() => { if (!busy) { setSelected(null); setError('') } }} onDelete={() => mutate(`/admin/animals/${selected.id}`, 'DELETE', undefined, 'Animal excluído.')} onUpdate={body => mutate(`/admin/${tab}/${selected.id}`, 'PATCH', body, 'Atendimento atualizado.')} />}
  </main>
}

function AdminDialog({ item, tab, onClose, onDelete, onUpdate, busy, error }) {
  const dialog = useRef()
  useEffect(() => { const node = dialog.current; node.showModal(); return () => node.close() }, [])
  return <dialog ref={dialog} className="admin-dialog" aria-labelledby="dialog-title" onCancel={event => { event.preventDefault(); if (!busy) onClose() }}>
    <div className="section-heading"><h2 id="dialog-title">{item.action === 'delete' ? 'Excluir este animal?' : tab === 'applications' ? 'Candidatura de adoção' : 'Mensagem recebida'}</h2><button className="icon-button" aria-label="Fechar diálogo" onClick={onClose} disabled={busy}><Icon name="close" /></button></div>
    {item.action === 'delete' ? <>
      <p>Deseja excluir <strong>{item.name}</strong>? Esta ação não pode ser desfeita. Candidaturas são preservadas no histórico.</p>
      {error && <Notice error>{error}</Notice>}
      <div className="button-row"><button className="button button-danger" onClick={onDelete} disabled={busy}>{busy ? 'Excluindo…' : 'Sim, excluir'}</button><button className="button button-outline" onClick={onClose} disabled={busy}>Cancelar</button></div>
    </> : <>
      <div className="dialog-details">
        <h3>{item.name}</h3><p>{item.email}<br />{item.phone || 'Telefone não informado'}{item.city && <><br />{item.city}</>}</p>
        {tab === 'applications' ? <><p><strong>Animal:</strong> {item.animalName || 'Removido do cadastro'}</p>{item.housing && <p><strong>Moradia:</strong> {item.housing}</p>}{item.experience && <p className="preserve-lines"><strong>Experiência:</strong> {item.experience}</p>}</> : <><p><strong>Tipo:</strong> {label(item.type)}</p>{item.address && <p className="preserve-lines"><strong>Localização:</strong> {item.address}</p>}</>}
        <div className="message-body preserve-lines">{item.message || 'Mensagem não informada.'}</div>
      </div>
      <form className="form-stack" onSubmit={e => { e.preventDefault(); onUpdate(Object.fromEntries(new FormData(e.currentTarget))) }}>
        <Field label="Situação"><select name="status" defaultValue={item.status}>{(tab === 'applications' ? ['pending', 'approved', 'rejected'] : ['new', 'read', 'archived']).map(value => <option value={value} key={value}>{label(value)}</option>)}</select></Field>
        {tab === 'applications' && <><Field label="Anotações internas" hint="Não são enviadas ao solicitante."><textarea name="notes" rows={3} maxLength={3000} defaultValue={item.notes || ''} /></Field><small className="muted">Aprovar não altera a situação do animal. Marque como adotado no cadastro quando a adoção for concluída.</small></>}
        {error && <Notice error>{error}</Notice>}
        <button className="button" disabled={busy}>{busy ? 'Salvando…' : 'Salvar análise'}</button>
      </form>
    </>}
  </dialog>
}

export default function App() {
  const [location, setLocation] = useState(window.location.hash.slice(1) || '/')
  const [token, setToken] = useState(getToken)
  const [route, query = ''] = location.split('?')
  const mainRef = useRef()
  useEffect(() => {
    const update = () => { setLocation(window.location.hash.slice(1) || '/'); window.scrollTo(0, 0); mainRef.current?.focus() }
    window.addEventListener('hashchange', update)
    return () => window.removeEventListener('hashchange', update)
  }, [])
  useEffect(() => {
    const titles = { '/': 'Um novo começo', '/animais': 'Quero adotar', '/ajudar': 'Como ajudar', '/contato': 'Contato', '/admin': 'Área da equipe' }
    document.title = `${titles[route] || 'Conheça um amigo'} · Resgate Animal`
  }, [route])
  function logout() { saveToken(''); setToken('') }
  const requestedType = new URLSearchParams(query).get('tipo')
  const type = requestedType === 'report' ? 'abuse' : ['contact', 'donation', 'volunteer', 'abuse'].includes(requestedType) ? requestedType : null
  let content
  if (route === '/') content = <main id="main"><Home /></main>
  else if (route === '/animais') content = <Gallery />
  else if (/^\/animais\/[^/]+$/.test(route)) content = <AnimalDetail key={route} id={route.split('/')[2]} />
  else if (route === '/ajudar') content = <Help type={type || 'volunteer'} />
  else if (route === '/contato') content = <main id="main" className="container section"><div className="page-heading"><span className="eyebrow">ESTAMOS AQUI PARA ESCUTAR</span><h1>Uma conversa pode mudar tudo.</h1><p>Dúvidas, ideias ou um pedido de ajuda: conte para a gente.</p></div><Inquiry key={type || 'contact'} initialType={type || 'contact'} /></main>
  else if (route === '/admin') content = token ? <Admin token={token} onLogout={logout} /> : <Login onLogin={value => { saveToken(value); setToken(value) }} />
  else content = <main id="main" className="container section"><Empty title="Esse caminho não existe">Vamos voltar para onde começam as boas histórias?</Empty><a className="button" href="#/">Voltar ao início</a></main>
  return <><a className="skip-link" href="#main" onClick={e => { e.preventDefault(); mainRef.current?.focus(); document.getElementById('main')?.scrollIntoView() }}>Pular para o conteúdo</a><Header route={route} /><div ref={mainRef} tabIndex={-1} className="page-content">{content}</div><Footer /></>
}
