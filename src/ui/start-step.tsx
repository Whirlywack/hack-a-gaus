'use client'

import Link from 'next/link'

import { Btn, Icon, Wordmark } from './ui'
import { Field } from './parts'
import { useWide } from './mode'
import { t } from '../copy/register'

// The first step of the start flow, the one place where the accent floods:
// a blue block carries the question, the ground under it holds the field, and
// the action sits at the foot. Nothing is stored or sent yet.

export function StartStep() {
  const wide = useWide()

  const flood = (
    <div className="su-flood">
      <div className="su-top">
        <div className="su-top__left">{!wide && <Wordmark />}</div>
        <Link className="su-toplink" href="/prisijungti">{t('start.signin')}</Link>
      </div>
      <h1 className="v-display su-title">{t('start.title')}</h1>
      <p className="su-text">{t('start.text')}</p>
    </div>
  )
  const body = (
    <div className="su-content">
      <Field label={t('start.field.label')} placeholder={t('start.field.placeholder')} />
    </div>
  )
  const actions = (
    <div className="su-acts">
      <div className="su-primary">
        <Btn kind="primary" wide trailing={<Icon name="arrow-right" size={18} />}>{t('start.next')}</Btn>
      </div>
    </div>
  )

  if (wide)
    return (
      <div className="su-desk">
        {flood}
        <div className="su-right">
          {body}
          {actions}
        </div>
      </div>
    )
  return (
    <div className="su-page">
      {flood}
      {body}
      <div className="su-spacer" />
      {actions}
    </div>
  )
}
