-- ORGANIZACOES (TENANTS)
CREATE TABLE IF NOT EXISTS organizacoes (
  id SERIAL PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  plano VARCHAR(50) DEFAULT 'basic',
  instancia_whatsapp VARCHAR(100),
  criado_em TIMESTAMP DEFAULT NOW()
);

-- USUARIOS
CREATE TABLE IF NOT EXISTS usuarios (
  id SERIAL PRIMARY KEY,
  org_id INTEGER REFERENCES organizacoes(id),
  nome VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  hash_senha VARCHAR(255) NOT NULL,
  funcao VARCHAR(50) DEFAULT 'agent',
  criado_em TIMESTAMP DEFAULT NOW()
);

-- EVENTOS
CREATE TABLE IF NOT EXISTS eventos (
  id SERIAL PRIMARY KEY,
  org_id INTEGER REFERENCES organizacoes(id),
  nome VARCHAR(255) NOT NULL,
  id_grupo VARCHAR(255),
  orcamento DECIMAL(12,2) DEFAULT 0,
  criado_em TIMESTAMP DEFAULT NOW()
);

-- DESPESAS
CREATE TABLE IF NOT EXISTS despesas (
  id SERIAL PRIMARY KEY,
  id_evento INTEGER REFERENCES eventos(id),
  org_id INTEGER REFERENCES organizacoes(id),
  valor DECIMAL(12,2) NOT NULL,
  fornecedor VARCHAR(255),
  data VARCHAR(20),
  descricao TEXT,
  centro_custo VARCHAR(100),
  registrado_por VARCHAR(255),
  fonte VARCHAR(50),
  criado_em TIMESTAMP DEFAULT NOW()
);

-- CHAMADOS
CREATE TABLE IF NOT EXISTS chamados (
  id SERIAL PRIMARY KEY,
  org_id INTEGER REFERENCES organizacoes(id),
  nome_cliente VARCHAR(255),
  telefone_cliente VARCHAR(100),
  remote_jid VARCHAR(255),
  numero_real VARCHAR(100),
  canal VARCHAR(50) DEFAULT 'WhatsApp',
  tipo_agente VARCHAR(50) DEFAULT 'atendimento',
  topico TEXT,
  status VARCHAR(50) DEFAULT 'novo',
  prioridade VARCHAR(50) DEFAULT 'media',
  modo_automatico BOOLEAN DEFAULT true,
  criado_em TIMESTAMP DEFAULT NOW(),
  atualizado_em TIMESTAMP DEFAULT NOW()
);

-- MENSAGENS
CREATE TABLE IF NOT EXISTS mensagens (
  id SERIAL PRIMARY KEY,
  id_chamado INTEGER REFERENCES chamados(id),
  tipo_origem VARCHAR(50),
  texto TEXT,
  hora VARCHAR(20),
  criado_em TIMESTAMP DEFAULT NOW()
);

-- ANOTACOES
CREATE TABLE IF NOT EXISTS anotacoes (
  id SERIAL PRIMARY KEY,
  id_chamado INTEGER REFERENCES chamados(id),
  texto TEXT,
  hora VARCHAR(20),
  criado_em TIMESTAMP DEFAULT NOW()
);

-- MAPA DE LIDS
CREATE TABLE IF NOT EXISTS mapa_lids (
  lid VARCHAR(255) PRIMARY KEY,
  numero VARCHAR(100) NOT NULL
);

-- FORNECEDORES
CREATE TABLE IF NOT EXISTS fornecedores (
  id SERIAL PRIMARY KEY,
  org_id INTEGER REFERENCES organizacoes(id),
  id_evento INTEGER REFERENCES eventos(id),
  nome VARCHAR(255) NOT NULL,
  categoria VARCHAR(100) DEFAULT 'Outros',
  nome_contato VARCHAR(255) DEFAULT '',
  telefone_contato VARCHAR(100) DEFAULT '',
  email_contato VARCHAR(255) DEFAULT '',
  valor DECIMAL(12,2) DEFAULT 0,
  status VARCHAR(50) DEFAULT 'pendente',
  pago BOOLEAN DEFAULT false,
  notas TEXT DEFAULT '',
  data_vencimento VARCHAR(20) DEFAULT '',
  criado_em TIMESTAMP DEFAULT NOW(),
  atualizado_em TIMESTAMP DEFAULT NOW()
);

-- BRIEFINGS DE MARKETING
CREATE TABLE IF NOT EXISTS briefings (
  id SERIAL PRIMARY KEY,
  org_id INTEGER REFERENCES organizacoes(id),
  id_evento INTEGER REFERENCES eventos(id),
  titulo VARCHAR(255) NOT NULL,
  tipo VARCHAR(50) DEFAULT 'post',
  descricao TEXT DEFAULT '',
  publico_alvo TEXT DEFAULT '',
  mensagem_chave TEXT DEFAULT '',
  referencias_visuais TEXT DEFAULT '',
  dimensoes VARCHAR(100) DEFAULT '',
  status VARCHAR(50) DEFAULT 'pendente',
  atribuido_para VARCHAR(255) DEFAULT '',
  data_vencimento VARCHAR(20) DEFAULT '',
  feedback TEXT DEFAULT '',
  criado_em TIMESTAMP DEFAULT NOW(),
  atualizado_em TIMESTAMP DEFAULT NOW()
);

-- CRONOGRAMA DE MARKETING
CREATE TABLE IF NOT EXISTS cronograma_marketing (
  id SERIAL PRIMARY KEY,
  org_id INTEGER REFERENCES organizacoes(id),
  id_evento INTEGER REFERENCES eventos(id),
  titulo VARCHAR(255) NOT NULL,
  plataforma VARCHAR(100) DEFAULT '',
  data_publicacao VARCHAR(20) DEFAULT '',
  hora_publicacao VARCHAR(20) DEFAULT '',
  conteudo TEXT DEFAULT '',
  hashtags TEXT DEFAULT '',
  status VARCHAR(50) DEFAULT 'pendente',
  criado_em TIMESTAMP DEFAULT NOW()
);

-- MATERIAIS DE MARKETING
CREATE TABLE IF NOT EXISTS materiais_marketing (
  id SERIAL PRIMARY KEY,
  org_id INTEGER REFERENCES organizacoes(id),
  id_evento INTEGER REFERENCES eventos(id),
  nome VARCHAR(255) NOT NULL,
  categoria VARCHAR(100) DEFAULT '',
  status VARCHAR(50) DEFAULT 'pendente',
  atribuido_para VARCHAR(255) DEFAULT '',
  data_vencimento VARCHAR(20) DEFAULT '',
  notas TEXT DEFAULT '',
  concluido BOOLEAN DEFAULT false,
  criado_em TIMESTAMP DEFAULT NOW()
);

-- INSERIR ORGANIZACAO PADRAO
INSERT INTO organizacoes (nome, slug, instancia_whatsapp) VALUES ('EventHub Produções', 'eventhub', 'meuwhats') ON CONFLICT DO NOTHING;
