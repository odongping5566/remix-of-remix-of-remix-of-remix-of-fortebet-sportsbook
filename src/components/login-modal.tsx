import { useState, type FormEvent } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Eye, EyeOff, LogIn, UserRound, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { closeLogin, openLogin, openRegister, openForgot, useLoginOpen, validateLogin, type AccountWindow } from "@/lib/login-modal";
import countries from "@/lib/registration-countries.json";

const field = "box-border h-9 w-full min-w-0 rounded border border-account-line bg-account-field px-2 text-sm text-account-ink outline-none placeholder:text-site-import-muted-foreground focus:border-brand-500";
const action = "h-9 w-full rounded bg-brand-500 text-account-ink font-bold hover:bg-brand-700";
const subtle = "border border-account-line bg-account-surface text-account-ink hover:bg-account-field";

/** Disconnected public-layout preview: no requests, sessions, or storage. */
export function LoginModal() {
  const mode = useLoginOpen();
  return <Dialog.Root open={mode !== null} onOpenChange={(value) => { if (!value) closeLogin(); }}>
    {mode && <AccountForm key={mode} mode={mode} />}
  </Dialog.Root>;
}

function AccountForm({ mode }: { mode: AccountWindow }) {
  const [show, setShow] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ username?: string; password?: string }>({});
  const [submitted, setSubmitted] = useState(false);
  const register = mode === "register";
  const title = register ? "New registration" : mode === "forgot" ? "Lost password?" : "Login";

  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (mode === "login") {
      const found = validateLogin(username, password);
      setErrors(found);
      if (Object.keys(found).length) return;
    } else if (!e.currentTarget.reportValidity()) return;
    e.currentTarget.reset();
    setUsername("");
    setPassword("");
    setShow(false);
    setSubmitted(true);
  }

  return <Dialog.Portal>
    <Dialog.Overlay className="fixed inset-0 z-[1000] bg-account-overlay" />
    <Dialog.Content className={`fixed left-1/2 top-1/2 z-[1001] max-h-[92dvh] w-[calc(100%-24px)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-md bg-account-surface text-account-ink shadow-account outline-none ${register ? "max-w-[1100px]" : "max-w-[340px]"}`}>
      <header className={`relative flex h-12 items-center gap-2 px-4 ${register ? "bg-account-field" : "bg-brand-600"}`}>
        {register && <UserRound size={18} />}
        <Dialog.Title className={`text-sm font-black uppercase ${register ? "" : "w-full text-center"}`}>{title}</Dialog.Title>
        <Dialog.Close asChild><Button variant="ghost" size="icon" aria-label="Close account window" className="absolute right-1 top-1.5 text-account-ink hover:bg-account-field"><X /></Button></Dialog.Close>
      </header>
      <Dialog.Description className="border-b border-account-line px-4 py-2 text-center text-xs text-site-import-muted-foreground">Preview only · Use sample details. Nothing is sent or saved.</Dialog.Description>
      {submitted ? <div className="space-y-4 p-6 text-center">
        <p role="status" className="text-sm">{register ? "Registration preview complete. No account was created." : mode === "forgot" ? "Password recovery preview complete. No message was sent." : "Login preview complete. You are not signed in."}</p>
        <Button className={action} onClick={() => setSubmitted(false)}>Back to form</Button>
      </div> : <form onSubmit={submit} noValidate className={register ? "grid gap-7 p-5 md:grid-cols-2" : "space-y-3 px-8 py-7"}>
        {register ? <>
          <div className="space-y-3">
            <RegistrationField label="Name" placeholder="Enter your FIRST NAME" required />
            <RegistrationField label="Surname" placeholder="Enter your LAST NAME" required />
            <RegistrationField label="Username" placeholder="Enter your USERNAME" required />
            <div className="grid grid-cols-[82px_minmax(0,1fr)] items-center gap-2"><label htmlFor="register-phone" className="text-xs">Mobile/GSM</label><div className="flex min-w-0 gap-2"><span className="flex h-9 items-center rounded border border-brand-500 bg-brand-500/10 px-2 text-xs">+256</span><input id="register-phone" aria-label="Mobile/GSM" className={field} placeholder="Enter your PHONE NUMBER" inputMode="tel" required /></div></div>
            <div className="grid grid-cols-[82px_minmax(0,1fr)] items-center gap-2"><label htmlFor="register-email" className="text-xs">E-mail</label><input id="register-email" className={field} type="email" placeholder="for example name@gmail.com" /></div>
            <div className="grid grid-cols-[82px_minmax(0,1fr)] items-center gap-2"><span className="text-xs">Birth date</span><div className="grid min-w-0 grid-cols-[1fr_1.7fr_1.2fr] gap-2">
              <select aria-label="Birth day" className={field} required defaultValue=""><option value="">Day</option>{Array.from({length:31},(_,i)=><option key={i}>{i+1}</option>)}</select>
              <select aria-label="Birth month" className={field} required defaultValue=""><option value="">Month</option>{["January","February","March","April","May","June","July","August","September","October","November","December"].map((m,i)=><option key={m} value={i+1}>{m}</option>)}</select>
              <select aria-label="Birth year" className={field} required defaultValue=""><option value="">Year</option>{Array.from({length:110},(_,i)=><option key={i}>{new Date().getUTCFullYear()-i}</option>)}</select>
            </div></div>
            <div className="grid grid-cols-[82px_minmax(0,1fr)] items-center gap-2"><label htmlFor="register-country" className="text-xs">Nationality</label><select id="register-country" className={field} defaultValue="UG">{countries.map(c=><option key={c.code} value={c.code}>{c.name}</option>)}</select></div>
            <RegistrationField label="NIN number" placeholder="Enter your NIN" required />
            <RegistrationField label="Promo" placeholder="Enter your PROMO code" />
            <label className="flex items-start gap-2 pl-0 text-xs leading-5 md:pl-[90px]"><input type="checkbox" required className="mt-1 accent-brand-500" /> <span>I have read and accepted the general Terms and Conditions and I confirm that I am older than 18 years</span></label>
            <div className="md:pl-[90px]"><Button type="submit" className={action}>Confirm registration</Button></div>
            <div className="text-center text-xs">Already registered? <Button variant="link" type="button" onClick={openLogin} className="h-auto p-1 text-brand-500">Login</Button></div>
          </div>
          <aside className="space-y-4 border-t border-account-line pt-4 text-xs leading-5 md:border-t-0 md:pt-0">
            {[["1. Name, Surname", "Your first name and your family name."],["2. Username", "Choose your username."],["3. Mobile number", "Only Ugandan phone numbers are accepted on the original registration form."],["4. E-mail", "E-mail is optional in the original registration form."],["5. Date of birth", "Day, month and year of your birthday."],["6. NIN Number or Passport / Refugee card", "The original form requests an identity number. Use sample details in this preview."],["7. Terms", "General Terms and Conditions and age confirmation."],["8. Finish registration", "This preview does not create an account."]].map(([heading,text])=><section key={heading}><h3 className="font-bold">{heading}</h3><p className="mt-1 text-site-import-muted-foreground">{text}</p></section>)}
          </aside>
        </> : <>
          <input aria-label="Username" className={`${field} text-center`} value={username} onChange={e=>setUsername(e.target.value)} placeholder="USERNAME" autoComplete="off" aria-invalid={Boolean(errors.username)} />
          {errors.username && <p role="alert" className="text-xs text-destructive">{errors.username}</p>}
          {mode === "login" && <><div className="relative"><input aria-label="Password" type={show ? "text" : "password"} className={`${field} pr-10 text-center`} value={password} onChange={e=>setPassword(e.target.value)} placeholder="PASSWORD" autoComplete="off" aria-invalid={Boolean(errors.password)} /><Button type="button" variant="ghost" size="icon" title={show ? "Hide password" : "Show password"} aria-label={show ? "Hide password" : "Show password"} onClick={()=>setShow(!show)} className="absolute right-0 top-0 text-site-import-muted-foreground hover:bg-transparent">{show ? <EyeOff /> : <Eye />}</Button></div>
          {errors.password && <p role="alert" className="text-xs text-destructive">{errors.password}</p>}
          <div className="flex justify-end"><Button type="button" variant="outline" size="sm" className={subtle} onClick={openForgot}>Lost Password?</Button></div></>}
          <Button type="submit" className={action}>{mode === "login" && <LogIn />}{mode === "login" ? "Login" : "Recover password"}</Button>
          <div className="flex flex-wrap items-center justify-end gap-2 text-xs"><span>{mode === "login" ? "Not registered yet?" : "Remember your password?"}</span><Button type="button" variant="outline" size="sm" className={subtle} onClick={mode === "login" ? openRegister : openLogin}>{mode === "login" ? "Register now!" : "Login"}</Button></div>
        </>}
      </form>}
    </Dialog.Content>
  </Dialog.Portal>;
}

function RegistrationField({label, placeholder, required = false}: {label:string; placeholder:string; required?:boolean}) {
  const id = `register-${label.toLowerCase().replaceAll(" ", "-")}`;
  return <div className="grid grid-cols-[82px_minmax(0,1fr)] items-center gap-2"><label htmlFor={id} className="text-xs">{label}</label><input id={id} className={field} placeholder={placeholder} required={required} autoComplete="off" /></div>;
}
