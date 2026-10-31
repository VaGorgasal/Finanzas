export function passwordIssue(password:string,confirmation:string){
 if(password.length<12)return 'Usa una contraseña de al menos 12 caracteres.';
 if(password.length>128)return 'La contraseña no puede superar 128 caracteres.';
 if(password!==confirmation)return 'Las contraseñas no coinciden.';
 return null;
}
