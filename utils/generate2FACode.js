function generate2FACode (){
    return Math.floor(100000 + Math.random() * 900000).toString();
}

export { generate2FACode };