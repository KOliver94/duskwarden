import { expect, test, type Page } from '@playwright/test'

const counters = (page: Page) =>
  page.evaluate(() => {
    const w = window as unknown as { tones: number; vibes: number }
    return { tones: w.tones, vibes: w.vibes }
  })

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const w = window as unknown as { tones: number; vibes: number }
    w.tones = 0
    w.vibes = 0
    const create = AudioContext.prototype.createOscillator
    AudioContext.prototype.createOscillator = function () {
      w.tones++
      return create.call(this)
    }
    Object.defineProperty(navigator, 'vibrate', {
      configurable: true,
      value: () => {
        w.vibes++
        return true
      },
    })
  })
})

test('night countdowns stay silent while the discussion countdown alerts', async ({ page }) => {
  // Animations only finish when the fake clock moves, so every navigation advances it.
  await page.clock.install()
  const next = async () => {
    await page.getByRole('button', { name: 'Tovább', exact: true }).click()
    await page.clock.runFor(500)
  }
  await page.goto('/')
  await page.getByRole('button', { name: 'Új játék' }).click()
  for (const name of ['Anna', 'Bence', 'Csilla']) {
    await page.getByRole('button', { name: 'Játékos hozzáadása' }).click()
    await page.getByPlaceholder('Név').last().fill(name)
  }
  await next()
  await page.getByRole('button', { name: 'Gyilkos +1', exact: true }).click()
  await page.getByRole('button', { name: 'Feltöltés városlakókkal' }).click()
  await next()
  await next()
  await page.getByLabel('Vitaidő (perc)').fill('1')
  await next()
  await page.getByRole('button', { name: 'Indulhat a játék' }).click()
  await page.clock.runFor(500)
  await next()
  await next()

  await page.clock.runFor(31_000)
  await expect(page.getByRole('button', { name: 'Időzítő újraindítása' })).toHaveText('Lejárt')
  expect(await counters(page)).toEqual({ tones: 0, vibes: 0 })

  await page.getByRole('button', { name: 'Senkit' }).click()
  await next()
  await page.getByRole('button', { name: 'Jöhet a reggel' }).click()
  await page.clock.runFor(500)
  await next()
  await page.getByRole('button', { name: 'Indítás' }).click()
  await page.clock.runFor(61_000)
  await expect(page.getByText('Lejárt az idő! Jöhet a szavazás.')).toBeVisible()
  expect(await counters(page)).toEqual({ tones: 2, vibes: 1 })
})
