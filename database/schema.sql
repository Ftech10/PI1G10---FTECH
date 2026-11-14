CREATE DATABASE IF NOT EXISTS fithtech CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE fithtech;

CREATE TABLE IF NOT EXISTS usuarios (
 id INT AUTO_INCREMENT PRIMARY KEY,
 nome VARCHAR(120) NOT NULL,
 email VARCHAR(160) NOT NULL UNIQUE,
 telefone VARCHAR(30) NULL,
 senha_hash VARCHAR(255) NOT NULL,
 perfil ENUM('aluno','personal','admin') NOT NULL,
 bio VARCHAR(500) NULL,
 objetivo VARCHAR(180) NULL,
 demonstracao BOOLEAN NOT NULL DEFAULT FALSE,
 acesso_legado BOOLEAN NOT NULL DEFAULT FALSE,
 ativo BOOLEAN NOT NULL DEFAULT TRUE,
 session_version INT UNSIGNED NOT NULL DEFAULT 0,
 criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS aluno_personal (
 id INT AUTO_INCREMENT PRIMARY KEY,
 aluno_id INT NOT NULL,
 personal_id INT NOT NULL,
 ativo BOOLEAN NOT NULL DEFAULT TRUE,
 criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 UNIQUE KEY uq_aluno_personal (aluno_id,personal_id),
 CONSTRAINT fk_ap_aluno FOREIGN KEY (aluno_id) REFERENCES usuarios(id) ON DELETE CASCADE,
 CONSTRAINT fk_ap_personal FOREIGN KEY (personal_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS treinos (
 id INT AUTO_INCREMENT PRIMARY KEY,
 aluno_id INT NOT NULL,
 personal_id INT NOT NULL,
 nome VARCHAR(120) NOT NULL,
 foco VARCHAR(180) NOT NULL,
 dias_semana TINYINT NOT NULL DEFAULT 3,
 dias_treino VARCHAR(20) NULL,
 ativo BOOLEAN NOT NULL DEFAULT TRUE,
 criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
 INDEX idx_treinos_aluno_ativo (aluno_id,ativo),
 CONSTRAINT fk_treino_aluno FOREIGN KEY (aluno_id) REFERENCES usuarios(id) ON DELETE CASCADE,
 CONSTRAINT fk_treino_personal FOREIGN KEY (personal_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS exercicios (
 id INT AUTO_INCREMENT PRIMARY KEY,
 treino_id INT NOT NULL,
 nome VARCHAR(120) NOT NULL,
 grupo_muscular VARCHAR(80),
 series TINYINT,
 repeticoes VARCHAR(30),
 video_url VARCHAR(500),
 descanso_seg SMALLINT UNSIGNED NOT NULL DEFAULT 60,
 observacoes VARCHAR(500) NULL,
 ordem TINYINT DEFAULT 1,
 CONSTRAINT fk_ex_treino FOREIGN KEY (treino_id) REFERENCES treinos(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS progresso (
 id INT AUTO_INCREMENT PRIMARY KEY,
 aluno_id INT NOT NULL,
 exercicio_id INT NULL,
 exercicio_nome VARCHAR(120) NULL,
 treino_nome VARCHAR(120) NULL,
 data_execucao DATE NOT NULL,
 carga_kg DECIMAL(7,2) NULL,
 concluido_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
 UNIQUE KEY uq_progresso_dia (aluno_id,exercicio_id,data_execucao),
 INDEX idx_progresso_aluno_data (aluno_id,concluido_em),
 CONSTRAINT fk_prog_aluno FOREIGN KEY (aluno_id) REFERENCES usuarios(id) ON DELETE CASCADE,
 CONSTRAINT fk_prog_ex FOREIGN KEY (exercicio_id) REFERENCES exercicios(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS assinaturas (
 id CHAR(36) PRIMARY KEY,
 usuario_id INT NOT NULL,
 plano ENUM('mensal','anual') NOT NULL,
 cupom VARCHAR(40) NULL,
 subtotal_centavos INT UNSIGNED NOT NULL,
 desconto_centavos INT UNSIGNED NOT NULL DEFAULT 0,
 total_centavos INT UNSIGNED NOT NULL,
 status ENUM('pendente','pago') NOT NULL DEFAULT 'pendente',
 metodo ENUM('pix','cartao','demo') NULL,
 criado_em TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
 pago_em DATETIME NULL,
 valido_ate DATETIME NULL,
 INDEX idx_assinaturas_usuario_status (usuario_id,status,valido_ate),
 CONSTRAINT fk_assinatura_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);
