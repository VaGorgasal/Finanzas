export const PASSWORD_MIN_LENGTH=8;
export const PASSWORD_MAX_LENGTH=128;
// Matches the symbol set accepted by Supabase Auth's character requirement.
export const PASSWORD_SYMBOLS="!@#$%^&*()_+-=[]{};'\\\":|<>?,./`~";
export const PASSWORD_HINT='Mínimo 8 caracteres, con una mayúscula, una minúscula, un número y un símbolo (por ejemplo: !, @ o #).';
export function passwordIssue(password:string,confirmation:string){
 if(password.length<PASSWORD_MIN_LENGTH)return 'Usa una contraseña de al menos 8 caracteres.';
 if(password.length>PASSWORD_MAX_LENGTH)return 'La contraseña no puede superar 128 caracteres.';
 if(!/[a-z]/.test(password)||!/[A-Z]/.test(password))return 'Incluye al menos una letra mayúscula y una minúscula.';
 if(!/[0-9]/.test(password))return 'Incluye al menos un número.';
 if(![...password].some(character=>PASSWORD_SYMBOLS.includes(character)))return 'Incluye al menos un símbolo, por ejemplo !, @ o #.';
 if(password!==confirmation)return 'Las contraseñas no coinciden.';
 return null;
}
