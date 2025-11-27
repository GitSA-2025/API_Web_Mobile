// Função para gerar um código 2FA de 6 dígitos
function generate2FACode() {
    // Math.random() gera um número entre 0 (inclusive) e 1 (exclusive)
    // Multiplicando por 900000 gera um número entre 0 e 899999
    // Somando 100000, o resultado final fica entre 100000 e 999999
    // Math.floor() arredonda para baixo, garantindo que seja um número inteiro
    // .toString() converte o número para string, útil para enviar por e-mail ou SMS
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// Exporta a função para ser usada em outros arquivos
export { generate2FACode };
