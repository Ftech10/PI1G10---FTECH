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
