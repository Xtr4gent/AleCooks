import type { FormEvent } from 'react'

type AuthFormState = {
  username: string
  password: string
}

type AuthLoadingScreenProps = {
  title: string
  message: string
}

type AuthScreenProps = {
  authForm: AuthFormState
  authError: string
  authPending: boolean
  onSubmit: (event: FormEvent<HTMLFormElement>) => void | Promise<void>
  onUsernameChange: (value: string) => void
  onPasswordChange: (value: string) => void
}

export function AuthLoadingScreen({ title, message }: AuthLoadingScreenProps) {
  return (
    <div className="auth-screen">
      <div className="auth-card">
        <p className="eyebrow">AleCooks</p>
        <h1>{title}</h1>
        <p>{message}</p>
      </div>
    </div>
  )
}

export function AuthScreen({
  authForm,
  authError,
  authPending,
  onSubmit,
  onUsernameChange,
  onPasswordChange,
}: AuthScreenProps) {
  return (
    <div className="auth-screen">
      <form className="auth-card" onSubmit={onSubmit}>
        <p className="eyebrow">AleCooks</p>
        <h1>Welcome back to your menu board.</h1>
        <p className="auth-copy">
          AleCooks is now set up as a single-owner kitchen dashboard. Sign in with your
          username and password to get to the planner.
        </p>

        <label className="field">
          <span>Username</span>
          <input
            type="text"
            value={authForm.username}
            onChange={(event) => onUsernameChange(event.target.value)}
            placeholder="Ale"
            autoCapitalize="none"
            autoCorrect="off"
          />
        </label>

        <label className="field">
          <span>Password</span>
          <input
            type="password"
            value={authForm.password}
            onChange={(event) => onPasswordChange(event.target.value)}
            placeholder="At least one good secret"
          />
        </label>

        {authError ? <p className="auth-error">{authError}</p> : null}

        <button className="primary-button" type="submit" disabled={authPending}>
          {authPending ? 'Working...' : 'Sign in'}
        </button>
      </form>
    </div>
  )
}
