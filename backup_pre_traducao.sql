--
-- PostgreSQL database dump
--

\restrict c1Abx8NZQ5kHXcRWVzwsQGUrhmUnfatNZeZ4IZkEsIcwRJ51XOnkOX2mUzJKtrJ

-- Dumped from database version 16.12
-- Dumped by pg_dump version 16.12

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: briefings; Type: TABLE; Schema: public; Owner: eventhub
--

CREATE TABLE public.briefings (
    id integer NOT NULL,
    org_id integer,
    event_id integer,
    title character varying(255) NOT NULL,
    type character varying(50) DEFAULT 'post'::character varying,
    description text,
    target_audience text,
    key_message text,
    visual_references text,
    dimensions character varying(100),
    status character varying(50) DEFAULT 'pendente'::character varying,
    assigned_to character varying(255),
    due_date character varying(20),
    feedback text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.briefings OWNER TO eventhub;

--
-- Name: briefings_id_seq; Type: SEQUENCE; Schema: public; Owner: eventhub
--

CREATE SEQUENCE public.briefings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.briefings_id_seq OWNER TO eventhub;

--
-- Name: briefings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: eventhub
--

ALTER SEQUENCE public.briefings_id_seq OWNED BY public.briefings.id;


--
-- Name: events; Type: TABLE; Schema: public; Owner: eventhub
--

CREATE TABLE public.events (
    id integer NOT NULL,
    org_id integer,
    name character varying(255) NOT NULL,
    group_id character varying(255),
    budget numeric(12,2) DEFAULT 0,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.events OWNER TO eventhub;

--
-- Name: events_id_seq; Type: SEQUENCE; Schema: public; Owner: eventhub
--

CREATE SEQUENCE public.events_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.events_id_seq OWNER TO eventhub;

--
-- Name: events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: eventhub
--

ALTER SEQUENCE public.events_id_seq OWNED BY public.events.id;


--
-- Name: expenses; Type: TABLE; Schema: public; Owner: eventhub
--

CREATE TABLE public.expenses (
    id integer NOT NULL,
    event_id integer,
    org_id integer,
    valor numeric(12,2) NOT NULL,
    fornecedor character varying(255),
    data character varying(20),
    descricao text,
    centro_custo character varying(100),
    registrado_por character varying(255),
    source character varying(50),
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.expenses OWNER TO eventhub;

--
-- Name: expenses_id_seq; Type: SEQUENCE; Schema: public; Owner: eventhub
--

CREATE SEQUENCE public.expenses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.expenses_id_seq OWNER TO eventhub;

--
-- Name: expenses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: eventhub
--

ALTER SEQUENCE public.expenses_id_seq OWNED BY public.expenses.id;


--
-- Name: lid_map; Type: TABLE; Schema: public; Owner: eventhub
--

CREATE TABLE public.lid_map (
    lid character varying(255) NOT NULL,
    number character varying(100) NOT NULL
);


ALTER TABLE public.lid_map OWNER TO eventhub;

--
-- Name: marketing_materials; Type: TABLE; Schema: public; Owner: eventhub
--

CREATE TABLE public.marketing_materials (
    id integer NOT NULL,
    org_id integer,
    event_id integer,
    name character varying(255) NOT NULL,
    category character varying(100),
    status character varying(50) DEFAULT 'pendente'::character varying,
    assigned_to character varying(255),
    due_date character varying(20),
    notes text,
    done boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.marketing_materials OWNER TO eventhub;

--
-- Name: marketing_materials_id_seq; Type: SEQUENCE; Schema: public; Owner: eventhub
--

CREATE SEQUENCE public.marketing_materials_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.marketing_materials_id_seq OWNER TO eventhub;

--
-- Name: marketing_materials_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: eventhub
--

ALTER SEQUENCE public.marketing_materials_id_seq OWNED BY public.marketing_materials.id;


--
-- Name: marketing_timeline; Type: TABLE; Schema: public; Owner: eventhub
--

CREATE TABLE public.marketing_timeline (
    id integer NOT NULL,
    org_id integer,
    event_id integer,
    title character varying(255) NOT NULL,
    platform character varying(100),
    post_date character varying(20),
    post_time character varying(20),
    content text,
    hashtags text,
    status character varying(50) DEFAULT 'pendente'::character varying,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.marketing_timeline OWNER TO eventhub;

--
-- Name: marketing_timeline_id_seq; Type: SEQUENCE; Schema: public; Owner: eventhub
--

CREATE SEQUENCE public.marketing_timeline_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.marketing_timeline_id_seq OWNER TO eventhub;

--
-- Name: marketing_timeline_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: eventhub
--

ALTER SEQUENCE public.marketing_timeline_id_seq OWNED BY public.marketing_timeline.id;


--
-- Name: messages; Type: TABLE; Schema: public; Owner: eventhub
--

CREATE TABLE public.messages (
    id integer NOT NULL,
    ticket_id integer,
    from_type character varying(50),
    text text,
    "time" character varying(20),
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.messages OWNER TO eventhub;

--
-- Name: messages_id_seq; Type: SEQUENCE; Schema: public; Owner: eventhub
--

CREATE SEQUENCE public.messages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.messages_id_seq OWNER TO eventhub;

--
-- Name: messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: eventhub
--

ALTER SEQUENCE public.messages_id_seq OWNED BY public.messages.id;


--
-- Name: notes; Type: TABLE; Schema: public; Owner: eventhub
--

CREATE TABLE public.notes (
    id integer NOT NULL,
    ticket_id integer,
    text text,
    "time" character varying(20),
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.notes OWNER TO eventhub;

--
-- Name: notes_id_seq; Type: SEQUENCE; Schema: public; Owner: eventhub
--

CREATE SEQUENCE public.notes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.notes_id_seq OWNER TO eventhub;

--
-- Name: notes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: eventhub
--

ALTER SEQUENCE public.notes_id_seq OWNED BY public.notes.id;


--
-- Name: organizations; Type: TABLE; Schema: public; Owner: eventhub
--

CREATE TABLE public.organizations (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    slug character varying(100) NOT NULL,
    plan character varying(50) DEFAULT 'basic'::character varying,
    whatsapp_instance character varying(100),
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.organizations OWNER TO eventhub;

--
-- Name: organizations_id_seq; Type: SEQUENCE; Schema: public; Owner: eventhub
--

CREATE SEQUENCE public.organizations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.organizations_id_seq OWNER TO eventhub;

--
-- Name: organizations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: eventhub
--

ALTER SEQUENCE public.organizations_id_seq OWNED BY public.organizations.id;


--
-- Name: suppliers; Type: TABLE; Schema: public; Owner: eventhub
--

CREATE TABLE public.suppliers (
    id integer NOT NULL,
    org_id integer,
    event_id integer,
    name character varying(255) NOT NULL,
    category character varying(100) DEFAULT 'Outros'::character varying,
    contact_name character varying(255),
    contact_phone character varying(100),
    contact_email character varying(255),
    valor numeric(12,2) DEFAULT 0,
    status character varying(50) DEFAULT 'pendente'::character varying,
    notes text,
    due_date character varying(20),
    paid boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.suppliers OWNER TO eventhub;

--
-- Name: suppliers_id_seq; Type: SEQUENCE; Schema: public; Owner: eventhub
--

CREATE SEQUENCE public.suppliers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.suppliers_id_seq OWNER TO eventhub;

--
-- Name: suppliers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: eventhub
--

ALTER SEQUENCE public.suppliers_id_seq OWNED BY public.suppliers.id;


--
-- Name: tickets; Type: TABLE; Schema: public; Owner: eventhub
--

CREATE TABLE public.tickets (
    id integer NOT NULL,
    org_id integer,
    client_name character varying(255),
    client_phone character varying(100),
    remote_jid character varying(255),
    real_number character varying(100),
    channel character varying(50) DEFAULT 'WhatsApp'::character varying,
    agent_type character varying(50) DEFAULT 'atendimento'::character varying,
    topic text,
    status character varying(50) DEFAULT 'novo'::character varying,
    priority character varying(50) DEFAULT 'media'::character varying,
    auto_mode boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.tickets OWNER TO eventhub;

--
-- Name: tickets_id_seq; Type: SEQUENCE; Schema: public; Owner: eventhub
--

CREATE SEQUENCE public.tickets_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.tickets_id_seq OWNER TO eventhub;

--
-- Name: tickets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: eventhub
--

ALTER SEQUENCE public.tickets_id_seq OWNED BY public.tickets.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: eventhub
--

CREATE TABLE public.users (
    id integer NOT NULL,
    org_id integer,
    name character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    password_hash character varying(255) NOT NULL,
    role character varying(50) DEFAULT 'agent'::character varying,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.users OWNER TO eventhub;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: eventhub
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO eventhub;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: eventhub
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: briefings id; Type: DEFAULT; Schema: public; Owner: eventhub
--

ALTER TABLE ONLY public.briefings ALTER COLUMN id SET DEFAULT nextval('public.briefings_id_seq'::regclass);


--
-- Name: events id; Type: DEFAULT; Schema: public; Owner: eventhub
--

ALTER TABLE ONLY public.events ALTER COLUMN id SET DEFAULT nextval('public.events_id_seq'::regclass);


--
-- Name: expenses id; Type: DEFAULT; Schema: public; Owner: eventhub
--

ALTER TABLE ONLY public.expenses ALTER COLUMN id SET DEFAULT nextval('public.expenses_id_seq'::regclass);


--
-- Name: marketing_materials id; Type: DEFAULT; Schema: public; Owner: eventhub
--

ALTER TABLE ONLY public.marketing_materials ALTER COLUMN id SET DEFAULT nextval('public.marketing_materials_id_seq'::regclass);


--
-- Name: marketing_timeline id; Type: DEFAULT; Schema: public; Owner: eventhub
--

ALTER TABLE ONLY public.marketing_timeline ALTER COLUMN id SET DEFAULT nextval('public.marketing_timeline_id_seq'::regclass);


--
-- Name: messages id; Type: DEFAULT; Schema: public; Owner: eventhub
--

ALTER TABLE ONLY public.messages ALTER COLUMN id SET DEFAULT nextval('public.messages_id_seq'::regclass);


--
-- Name: notes id; Type: DEFAULT; Schema: public; Owner: eventhub
--

ALTER TABLE ONLY public.notes ALTER COLUMN id SET DEFAULT nextval('public.notes_id_seq'::regclass);


--
-- Name: organizations id; Type: DEFAULT; Schema: public; Owner: eventhub
--

ALTER TABLE ONLY public.organizations ALTER COLUMN id SET DEFAULT nextval('public.organizations_id_seq'::regclass);


--
-- Name: suppliers id; Type: DEFAULT; Schema: public; Owner: eventhub
--

ALTER TABLE ONLY public.suppliers ALTER COLUMN id SET DEFAULT nextval('public.suppliers_id_seq'::regclass);


--
-- Name: tickets id; Type: DEFAULT; Schema: public; Owner: eventhub
--

ALTER TABLE ONLY public.tickets ALTER COLUMN id SET DEFAULT nextval('public.tickets_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: eventhub
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Data for Name: briefings; Type: TABLE DATA; Schema: public; Owner: eventhub
--

COPY public.briefings (id, org_id, event_id, title, type, description, target_audience, key_message, visual_references, dimensions, status, assigned_to, due_date, feedback, created_at, updated_at) FROM stdin;
1	1	2	VIRADA DE LOTE	stories	blablabkaslalwi					pendente	RAFAEL	2026-02-18	\N	2026-02-19 02:35:15.808271	2026-02-19 02:35:15.808271
\.


--
-- Data for Name: events; Type: TABLE DATA; Schema: public; Owner: eventhub
--

COPY public.events (id, org_id, name, group_id, budget, created_at) FROM stdin;
1	1	MATUE X HUNGRIA	120363406491790188@g.us	0.00	2026-02-18 21:16:40.350617
2	1	Di Paullo e Paulino	120363407353924707@g.us	0.00	2026-02-18 21:16:40.356366
\.


--
-- Data for Name: expenses; Type: TABLE DATA; Schema: public; Owner: eventhub
--

COPY public.expenses (id, event_id, org_id, valor, fornecedor, data, descricao, centro_custo, registrado_por, source, created_at) FROM stdin;
1	1	1	20699.00	EXPAND EVENTOS	06/11/2025	Bebidas expand	Alimentacao/Bebidas	Gui Marinho	documento	2026-02-18 21:56:10.279163
2	1	1	3000.00	N/I	18/02/2026	Pagamento para segurança do evento	Seguranca	Gui Marinho	texto	2026-02-18 21:56:10.302832
3	2	1	700.00	KELLY POLYANA MENDES PIRES	18/02/2026	influenciadora DiPaulo E Paulinho	Marketing	Gui Marinho	documento	2026-02-18 21:56:10.304258
4	2	1	600.00	Luis Marden Matos Conde Júnior	18/02/2026	DADOS PARA PAGAMENTO	Outros	Breno Coutinho	texto	2026-02-18 21:56:10.305678
\.


--
-- Data for Name: lid_map; Type: TABLE DATA; Schema: public; Owner: eventhub
--

COPY public.lid_map (lid, number) FROM stdin;
124506890838214	5537999918141
\.


--
-- Data for Name: marketing_materials; Type: TABLE DATA; Schema: public; Owner: eventhub
--

COPY public.marketing_materials (id, org_id, event_id, name, category, status, assigned_to, due_date, notes, done, created_at) FROM stdin;
\.


--
-- Data for Name: marketing_timeline; Type: TABLE DATA; Schema: public; Owner: eventhub
--

COPY public.marketing_timeline (id, org_id, event_id, title, platform, post_date, post_time, content, hashtags, status, created_at) FROM stdin;
\.


--
-- Data for Name: messages; Type: TABLE DATA; Schema: public; Owner: eventhub
--

COPY public.messages (id, ticket_id, from_type, text, "time", created_at) FROM stdin;
1	1	client	Oi	19:33	2026-02-18 21:56:10.312283
2	1	agent	Oi, Gui! 👋 Bem-vindo ao Lavras Rodeo Festival 2026! 🤠 \n\nEstou aqui para te ajudar com tudo sobre nosso festival que vai rolar nos dias 15 e 16 de maio na Expolavras! Vai ter Natanzinho Lima + Matogrosso & Mathias, rodeio profissional e muito mais! 🎵🐂\n\nO que você gostaria de saber? 😊	19:33	2026-02-18 21:56:10.318921
\.


--
-- Data for Name: notes; Type: TABLE DATA; Schema: public; Owner: eventhub
--

COPY public.notes (id, ticket_id, text, "time", created_at) FROM stdin;
\.


--
-- Data for Name: organizations; Type: TABLE DATA; Schema: public; Owner: eventhub
--

COPY public.organizations (id, name, slug, plan, whatsapp_instance, created_at) FROM stdin;
1	EventHub Produções	eventhub	basic	meuwhats	2026-02-18 21:11:38.957529
\.


--
-- Data for Name: suppliers; Type: TABLE DATA; Schema: public; Owner: eventhub
--

COPY public.suppliers (id, org_id, event_id, name, category, contact_name, contact_phone, contact_email, valor, status, notes, due_date, paid, created_at, updated_at) FROM stdin;
1	1	1	XIMENES	Estrutura	37999918141			15000.00	confirmado			f	2026-02-18 23:32:37.583959	2026-02-18 23:32:58.084958
\.


--
-- Data for Name: tickets; Type: TABLE DATA; Schema: public; Owner: eventhub
--

COPY public.tickets (id, org_id, client_name, client_phone, remote_jid, real_number, channel, agent_type, topic, status, priority, auto_mode, created_at, updated_at) FROM stdin;
1	1	Gui Marinho	124506890838214	124506890838214@lid	5537999918141	WhatsApp	atendimento	Oi	respondido	media	t	2026-02-18 21:56:10.30755	2026-02-18 21:56:10.30755
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: eventhub
--

COPY public.users (id, org_id, name, email, password_hash, role, created_at) FROM stdin;
1	1	Lucas	lucas@eventhub.com	$2a$10$SWaaCxS9b0z6EjmJ3/iO2umeOosvC6V12/NzYmM9Org4uFqNLnyke	admin	2026-02-18 21:18:47.204484
3	1	Glauber	glauber@314br.com	$2a$10$czzloZw6Nkli745vNMhpDecW32Vsp.nLYVSDxm8G3prCz.SsmO9e.	agent	2026-02-19 03:01:51.390647
\.


--
-- Name: briefings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: eventhub
--

SELECT pg_catalog.setval('public.briefings_id_seq', 2, true);


--
-- Name: events_id_seq; Type: SEQUENCE SET; Schema: public; Owner: eventhub
--

SELECT pg_catalog.setval('public.events_id_seq', 3, true);


--
-- Name: expenses_id_seq; Type: SEQUENCE SET; Schema: public; Owner: eventhub
--

SELECT pg_catalog.setval('public.expenses_id_seq', 4, true);


--
-- Name: marketing_materials_id_seq; Type: SEQUENCE SET; Schema: public; Owner: eventhub
--

SELECT pg_catalog.setval('public.marketing_materials_id_seq', 1, true);


--
-- Name: marketing_timeline_id_seq; Type: SEQUENCE SET; Schema: public; Owner: eventhub
--

SELECT pg_catalog.setval('public.marketing_timeline_id_seq', 1, true);


--
-- Name: messages_id_seq; Type: SEQUENCE SET; Schema: public; Owner: eventhub
--

SELECT pg_catalog.setval('public.messages_id_seq', 2, true);


--
-- Name: notes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: eventhub
--

SELECT pg_catalog.setval('public.notes_id_seq', 1, false);


--
-- Name: organizations_id_seq; Type: SEQUENCE SET; Schema: public; Owner: eventhub
--

SELECT pg_catalog.setval('public.organizations_id_seq', 3, true);


--
-- Name: suppliers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: eventhub
--

SELECT pg_catalog.setval('public.suppliers_id_seq', 2, true);


--
-- Name: tickets_id_seq; Type: SEQUENCE SET; Schema: public; Owner: eventhub
--

SELECT pg_catalog.setval('public.tickets_id_seq', 1, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: eventhub
--

SELECT pg_catalog.setval('public.users_id_seq', 3, true);


--
-- Name: briefings briefings_pkey; Type: CONSTRAINT; Schema: public; Owner: eventhub
--

ALTER TABLE ONLY public.briefings
    ADD CONSTRAINT briefings_pkey PRIMARY KEY (id);


--
-- Name: events events_pkey; Type: CONSTRAINT; Schema: public; Owner: eventhub
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_pkey PRIMARY KEY (id);


--
-- Name: expenses expenses_pkey; Type: CONSTRAINT; Schema: public; Owner: eventhub
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_pkey PRIMARY KEY (id);


--
-- Name: lid_map lid_map_pkey; Type: CONSTRAINT; Schema: public; Owner: eventhub
--

ALTER TABLE ONLY public.lid_map
    ADD CONSTRAINT lid_map_pkey PRIMARY KEY (lid);


--
-- Name: marketing_materials marketing_materials_pkey; Type: CONSTRAINT; Schema: public; Owner: eventhub
--

ALTER TABLE ONLY public.marketing_materials
    ADD CONSTRAINT marketing_materials_pkey PRIMARY KEY (id);


--
-- Name: marketing_timeline marketing_timeline_pkey; Type: CONSTRAINT; Schema: public; Owner: eventhub
--

ALTER TABLE ONLY public.marketing_timeline
    ADD CONSTRAINT marketing_timeline_pkey PRIMARY KEY (id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: eventhub
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: notes notes_pkey; Type: CONSTRAINT; Schema: public; Owner: eventhub
--

ALTER TABLE ONLY public.notes
    ADD CONSTRAINT notes_pkey PRIMARY KEY (id);


--
-- Name: organizations organizations_pkey; Type: CONSTRAINT; Schema: public; Owner: eventhub
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_pkey PRIMARY KEY (id);


--
-- Name: organizations organizations_slug_key; Type: CONSTRAINT; Schema: public; Owner: eventhub
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_slug_key UNIQUE (slug);


--
-- Name: suppliers suppliers_pkey; Type: CONSTRAINT; Schema: public; Owner: eventhub
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_pkey PRIMARY KEY (id);


--
-- Name: tickets tickets_pkey; Type: CONSTRAINT; Schema: public; Owner: eventhub
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: eventhub
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: eventhub
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: briefings briefings_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: eventhub
--

ALTER TABLE ONLY public.briefings
    ADD CONSTRAINT briefings_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id);


--
-- Name: briefings briefings_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: eventhub
--

ALTER TABLE ONLY public.briefings
    ADD CONSTRAINT briefings_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id);


--
-- Name: events events_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: eventhub
--

ALTER TABLE ONLY public.events
    ADD CONSTRAINT events_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id);


--
-- Name: expenses expenses_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: eventhub
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id);


--
-- Name: expenses expenses_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: eventhub
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id);


--
-- Name: marketing_materials marketing_materials_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: eventhub
--

ALTER TABLE ONLY public.marketing_materials
    ADD CONSTRAINT marketing_materials_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id);


--
-- Name: marketing_materials marketing_materials_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: eventhub
--

ALTER TABLE ONLY public.marketing_materials
    ADD CONSTRAINT marketing_materials_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id);


--
-- Name: marketing_timeline marketing_timeline_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: eventhub
--

ALTER TABLE ONLY public.marketing_timeline
    ADD CONSTRAINT marketing_timeline_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id);


--
-- Name: marketing_timeline marketing_timeline_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: eventhub
--

ALTER TABLE ONLY public.marketing_timeline
    ADD CONSTRAINT marketing_timeline_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id);


--
-- Name: messages messages_ticket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: eventhub
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.tickets(id);


--
-- Name: notes notes_ticket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: eventhub
--

ALTER TABLE ONLY public.notes
    ADD CONSTRAINT notes_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.tickets(id);


--
-- Name: suppliers suppliers_event_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: eventhub
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_event_id_fkey FOREIGN KEY (event_id) REFERENCES public.events(id);


--
-- Name: suppliers suppliers_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: eventhub
--

ALTER TABLE ONLY public.suppliers
    ADD CONSTRAINT suppliers_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id);


--
-- Name: tickets tickets_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: eventhub
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id);


--
-- Name: users users_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: eventhub
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id);


--
-- PostgreSQL database dump complete
--

\unrestrict c1Abx8NZQ5kHXcRWVzwsQGUrhmUnfatNZeZ4IZkEsIcwRJ51XOnkOX2mUzJKtrJ

