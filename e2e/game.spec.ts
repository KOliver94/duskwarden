import { expect, test, type Page } from '@playwright/test'

const NAMES = ['Anna', 'Bence', 'Csilla', 'Dani', 'Emese']

const next = (page: Page) => page.getByRole('button', { name: 'Tovább', exact: true }).click()
const pick = (page: Page, name: string) =>
  page
    .getByRole('group', { name: 'Játékosok' })
    .getByRole('button', { name: new RegExp(name) })
    .click()

// Reading the stored record keeps the reload from racing the ~1 ms IndexedDB write.
const savedInputCount = (page: Page) =>
  page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        const open = indexedDB.open('duskwarden')
        open.onsuccess = () => {
          const db = open.result
          const tx = db.transaction(['prefs', 'games'])
          const id = tx.objectStore('prefs').get('activeGameId')
          id.onsuccess = () => {
            const game = tx.objectStore('games').get(id.result)
            game.onsuccess = () => {
              resolve(Object.keys(game.result.inputs).length)
              db.close()
            }
          }
        }
      }),
  )

async function setUpGame(page: Page) {
  await page.goto('/')
  await page.getByRole('button', { name: 'Új játék' }).click()
  for (const name of NAMES) {
    await page.getByRole('button', { name: 'Játékos hozzáadása' }).click()
    await page.getByPlaceholder('Név').last().fill(name)
  }
  await next(page)
  for (const role of ['Gyilkos', 'Orvos', 'Nyomozó']) {
    await page.getByRole('button', { name: `${role} +1`, exact: true }).click()
  }
  await page.getByRole('button', { name: 'Feltöltés városlakókkal' }).click()
  await next(page)
  await next(page)
  await next(page)
  const rows = await page.getByTestId('assignment').allTextContents()
  const byRole = new Map<string, string[]>()
  for (const row of rows) {
    const [, name, role] = row.match(/^\d+\. (.+) – (.+)$/)!
    byRole.set(role, [...(byRole.get(role) ?? []), name])
  }
  await page.getByRole('button', { name: 'Indulhat a játék' }).click()
  return {
    killer: byRole.get('Gyilkos')![0],
    doctor: byRole.get('Orvos')![0],
    villagers: byRole.get('Városlakó')!,
  }
}

test('plays a full game, survives a reload and keeps browser back inside the app', async ({
  page,
}) => {
  const cast = await setUpGame(page)

  await expect(page.getByText('Leszállt az éj. Mindenki csukja be a szemét!')).toBeVisible()
  await next(page)
  await next(page)

  await expect(page.getByRole('heading', { name: 'Gyilkos' })).toBeVisible()
  await pick(page, cast.villagers[0])
  await next(page)

  await expect(page.getByRole('heading', { name: 'Orvos' })).toBeVisible()
  await pick(page, cast.villagers[1])
  await expect.poll(() => savedInputCount(page)).toBe(2)
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Orvos' })).toBeVisible()
  await expect(
    page
      .getByRole('group', { name: 'Játékosok' })
      .getByRole('button', { name: new RegExp(cast.villagers[1]) }),
  ).toHaveAttribute('aria-pressed', 'true')
  await next(page)

  await expect(page.getByRole('heading', { name: 'Nyomozó' })).toBeVisible()
  await pick(page, cast.killer)
  await expect(page.getByText('Gyanús 👍')).toBeVisible()
  await next(page)
  await page.getByRole('button', { name: 'Jöhet a reggel' }).click()

  await expect(page.getByText('Az éjszaka meghalt:')).toBeVisible()
  await expect(page.getByText(new RegExp(`☠ ${cast.villagers[0]}`))).toBeVisible()
  await page.getByRole('button', { name: 'Szerep felfedése' }).click()
  await expect(page.getByText(new RegExp(`☠ ${cast.villagers[0]} – Városlakó`))).toBeVisible()
  await page.getByRole('button', { name: 'Elrejtés' }).click()
  await expect(page.getByText(/– Városlakó/)).toHaveCount(0)

  await page.goBack()
  await expect(page.getByText('Újranyitod az 1. éjszakát?')).toBeVisible()
  await page.getByRole('button', { name: 'Mégse' }).click()
  await expect(page.getByText('Az éjszaka meghalt:')).toBeVisible()

  await next(page)
  await next(page)

  // 4 players are alive, so 3 votes are a majority
  await page.getByRole('button', { name: 'Jelölt hozzáadása' }).click()
  await pick(page, cast.killer)
  for (let i = 0; i < 3; i++) {
    await page.getByRole('button', { name: `${cast.killer} szavazatai +1` }).click()
  }
  await next(page)

  await expect(page.getByText(`${cast.killer} kivégzésre kerül.`)).toBeVisible()
  await expect(page.getByText(/Szerepe:/)).toHaveCount(0)
  await page.getByRole('button', { name: 'Szerep felfedése' }).click()
  await expect(page.getByText(/Szerepe:\s*Gyilkos/)).toBeVisible()
  await page.getByRole('button', { name: 'Elrejtés' }).click()
  await expect(page.getByText(/Szerepe:/)).toHaveCount(0)
  await page.getByRole('button', { name: 'Szerep felfedése' }).click()
  await expect(page.getByText(/Szerepe:\s*Gyilkos/)).toBeVisible()

  await next(page)
  await expect(page.getByRole('alertdialog')).toContainText('A város nyert!')
  await page.getByRole('button', { name: 'Játék vége' }).click()
  await expect(page.getByText('A város nyert!')).toBeVisible()
  await expect(page.getByText('Krónika')).toBeVisible()
})
