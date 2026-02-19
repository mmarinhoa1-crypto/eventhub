-- =============================================================
-- MIGRAÇÃO: Traduzir todo o schema para Português
-- Executar com: docker exec -i eventhub_postgres psql -U eventhub -d eventhub < migrate_pt.sql
-- =============================================================

BEGIN;

-- =============================================================
-- PARTE 1: RENOMEAR COLUNAS (enquanto tabelas ainda têm nomes antigos)
-- =============================================================

-- organizations
ALTER TABLE organizations RENAME COLUMN name TO nome;
ALTER TABLE organizations RENAME COLUMN plan TO plano;
ALTER TABLE organizations RENAME COLUMN whatsapp_instance TO instancia_whatsapp;
ALTER TABLE organizations RENAME COLUMN created_at TO criado_em;

-- users
ALTER TABLE users RENAME COLUMN name TO nome;
ALTER TABLE users RENAME COLUMN password_hash TO hash_senha;
ALTER TABLE users RENAME COLUMN role TO funcao;
ALTER TABLE users RENAME COLUMN created_at TO criado_em;

-- events
ALTER TABLE events RENAME COLUMN name TO nome;
ALTER TABLE events RENAME COLUMN group_id TO id_grupo;
ALTER TABLE events RENAME COLUMN budget TO orcamento;
ALTER TABLE events RENAME COLUMN created_at TO criado_em;

-- expenses
ALTER TABLE expenses RENAME COLUMN event_id TO id_evento;
ALTER TABLE expenses RENAME COLUMN source TO fonte;
ALTER TABLE expenses RENAME COLUMN created_at TO criado_em;

-- tickets
ALTER TABLE tickets RENAME COLUMN client_name TO nome_cliente;
ALTER TABLE tickets RENAME COLUMN client_phone TO telefone_cliente;
ALTER TABLE tickets RENAME COLUMN real_number TO numero_real;
ALTER TABLE tickets RENAME COLUMN channel TO canal;
ALTER TABLE tickets RENAME COLUMN agent_type TO tipo_agente;
ALTER TABLE tickets RENAME COLUMN topic TO topico;
ALTER TABLE tickets RENAME COLUMN priority TO prioridade;
ALTER TABLE tickets RENAME COLUMN auto_mode TO modo_automatico;
ALTER TABLE tickets RENAME COLUMN created_at TO criado_em;
ALTER TABLE tickets RENAME COLUMN updated_at TO atualizado_em;

-- messages
ALTER TABLE messages RENAME COLUMN ticket_id TO id_chamado;
ALTER TABLE messages RENAME COLUMN from_type TO tipo_origem;
ALTER TABLE messages RENAME COLUMN text TO texto;
ALTER TABLE messages RENAME COLUMN time TO hora;
ALTER TABLE messages RENAME COLUMN created_at TO criado_em;

-- notes
ALTER TABLE notes RENAME COLUMN ticket_id TO id_chamado;
ALTER TABLE notes RENAME COLUMN text TO texto;
ALTER TABLE notes RENAME COLUMN time TO hora;
ALTER TABLE notes RENAME COLUMN created_at TO criado_em;

-- lid_map
ALTER TABLE lid_map RENAME COLUMN number TO numero;

-- suppliers
ALTER TABLE suppliers RENAME COLUMN event_id TO id_evento;
ALTER TABLE suppliers RENAME COLUMN name TO nome;
ALTER TABLE suppliers RENAME COLUMN category TO categoria;
ALTER TABLE suppliers RENAME COLUMN contact_name TO nome_contato;
ALTER TABLE suppliers RENAME COLUMN contact_phone TO telefone_contato;
ALTER TABLE suppliers RENAME COLUMN contact_email TO email_contato;
ALTER TABLE suppliers RENAME COLUMN paid TO pago;
ALTER TABLE suppliers RENAME COLUMN notes TO notas;
ALTER TABLE suppliers RENAME COLUMN due_date TO data_vencimento;
ALTER TABLE suppliers RENAME COLUMN created_at TO criado_em;
ALTER TABLE suppliers RENAME COLUMN updated_at TO atualizado_em;

-- briefings
ALTER TABLE briefings RENAME COLUMN event_id TO id_evento;
ALTER TABLE briefings RENAME COLUMN title TO titulo;
ALTER TABLE briefings RENAME COLUMN type TO tipo;
ALTER TABLE briefings RENAME COLUMN description TO descricao;
ALTER TABLE briefings RENAME COLUMN target_audience TO publico_alvo;
ALTER TABLE briefings RENAME COLUMN key_message TO mensagem_chave;
ALTER TABLE briefings RENAME COLUMN visual_references TO referencias_visuais;
ALTER TABLE briefings RENAME COLUMN dimensions TO dimensoes;
ALTER TABLE briefings RENAME COLUMN assigned_to TO atribuido_para;
ALTER TABLE briefings RENAME COLUMN due_date TO data_vencimento;
ALTER TABLE briefings RENAME COLUMN created_at TO criado_em;
ALTER TABLE briefings RENAME COLUMN updated_at TO atualizado_em;

-- marketing_timeline
ALTER TABLE marketing_timeline RENAME COLUMN event_id TO id_evento;
ALTER TABLE marketing_timeline RENAME COLUMN title TO titulo;
ALTER TABLE marketing_timeline RENAME COLUMN platform TO plataforma;
ALTER TABLE marketing_timeline RENAME COLUMN post_date TO data_publicacao;
ALTER TABLE marketing_timeline RENAME COLUMN post_time TO hora_publicacao;
ALTER TABLE marketing_timeline RENAME COLUMN content TO conteudo;
ALTER TABLE marketing_timeline RENAME COLUMN created_at TO criado_em;

-- marketing_materials
ALTER TABLE marketing_materials RENAME COLUMN event_id TO id_evento;
ALTER TABLE marketing_materials RENAME COLUMN name TO nome;
ALTER TABLE marketing_materials RENAME COLUMN category TO categoria;
ALTER TABLE marketing_materials RENAME COLUMN assigned_to TO atribuido_para;
ALTER TABLE marketing_materials RENAME COLUMN due_date TO data_vencimento;
ALTER TABLE marketing_materials RENAME COLUMN notes TO notas;
ALTER TABLE marketing_materials RENAME COLUMN done TO concluido;
ALTER TABLE marketing_materials RENAME COLUMN created_at TO criado_em;

-- =============================================================
-- PARTE 2: RENOMEAR TABELAS
-- =============================================================

ALTER TABLE organizations RENAME TO organizacoes;
ALTER TABLE users RENAME TO usuarios;
ALTER TABLE events RENAME TO eventos;
ALTER TABLE expenses RENAME TO despesas;
ALTER TABLE tickets RENAME TO chamados;
ALTER TABLE messages RENAME TO mensagens;
ALTER TABLE notes RENAME TO anotacoes;
ALTER TABLE lid_map RENAME TO mapa_lids;
ALTER TABLE suppliers RENAME TO fornecedores;
-- briefings mantém o nome
ALTER TABLE marketing_timeline RENAME TO cronograma_marketing;
ALTER TABLE marketing_materials RENAME TO materiais_marketing;

COMMIT;
