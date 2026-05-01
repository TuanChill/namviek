import { faker } from '@faker-js/faker'
import {
  createDynDatabase,
  createField,
  createDynRecord,
  setFieldValue,
  createFieldOption,
  getUsers,
  ensureDefaultView,
} from '@local/database'
import { TEMPLATES } from '../config/templates.js'

/** Curated palette — each value is stored in the option and rendered by OptionChip */
const OPTION_COLORS = [
  '#f87171', // red-400
  '#fb923c', // orange-400
  '#facc15', // yellow-400
  '#4ade80', // green-400
  '#34d399', // emerald-400
  '#22d3ee', // cyan-400
  '#60a5fa', // blue-400
  '#818cf8', // indigo-400
  '#a78bfa', // violet-400
  '#e879f9', // fuchsia-400
  '#f472b6', // pink-400
]

export async function createDatabaseFromTemplate(templateId: string, name?: string, onProgress?: (msg: string) => Promise<void>) {
  console.log(`[Template] Starting creation for template ID: ${templateId}`);
  const template = TEMPLATES.find((t) => t.id === templateId)
  if (!template) {
    console.error(`[Template] Template not found: ${templateId}`);
    throw new Error('Template not found')
  }

  // 1. Create the database
  console.log(`[Template] Creating database...`);
  if (onProgress) await onProgress(`Creating database...`)
  const dbName = name && name.trim() ? name.trim() : template.name
  const db = await createDynDatabase(dbName, template.description)

  // Fetch users for person fields
  const users = await getUsers()
  const userIds = users.map((u) => u.id)

  // 2. Create the fields and their options
  console.log(`[Template] Creating fields...`);
  if (onProgress) await onProgress(`Creating fields...`)
  const fields = []
  const fieldIdToOptionsMap: Record<string, string[]> = {}

  for (const [idx, tField] of template.fields.entries()) {
    const isFirst = idx === 0 && tField.type === 'text'
    const field = await createField(db.id, tField.name, tField.type, { isPrimary: isFirst })
    fields.push({ ...tField, createdId: field.id })

    // If it's a select field, create options with random distinct colors
    if (tField.options && tField.options.length > 0) {
      fieldIdToOptionsMap[field.id] = []
      // Shuffle palette so options within the same field get different colors
      const shuffled = [...OPTION_COLORS].sort(() => Math.random() - 0.5)
      for (let i = 0; i < tField.options.length; i++) {
        const opt = tField.options[i]
        const color = shuffled[i % shuffled.length]
        const optionRecord = await createFieldOption(field.id, opt, color)
        fieldIdToOptionsMap[field.id].push(optionRecord.id)
      }
    }
  }

  // 3. Generate sample data (approx 20-30 records)
  const numRecords = faker.number.int({ min: 15, max: 25 })
  console.log(`[Template] Generating ${numRecords} sample records...`);
  if (onProgress) await onProgress(`Generating ${numRecords} sample records...`)
  
  for (let i = 0; i < numRecords; i++) {
    if (onProgress) await onProgress(`Generating record ${i + 1} of ${numRecords}...`)
    const record = await createDynRecord(db.id)

    for (const fieldDef of fields) {
      const fieldId = fieldDef.createdId
      const payload: any = {}

      // Handle nullability / empty data occasionally to make it realistic
      // But for some templates we probably want to fill it in.
      
      switch (fieldDef.type) {
        case 'text': {
          let text = ''
          if (fieldDef.fakerRule === 'company.catchPhrase') text = faker.company.catchPhrase()
          else if (fieldDef.fakerRule === 'company.bs') text = faker.company.buzzPhrase()
          else if (fieldDef.fakerRule === 'person.fullName') text = faker.person.fullName()
          else if (fieldDef.fakerRule === 'company.name') text = faker.company.name()
          else if (fieldDef.fakerRule === 'internet.email') text = faker.internet.email()
          else if (fieldDef.fakerRule === 'lorem.sentence') text = faker.lorem.sentence()
          else if (fieldDef.fakerRule === 'lorem.words') text = faker.lorem.words(3)
          else if (fieldDef.fakerRule === 'person.jobTitle') text = faker.person.jobTitle()
          else text = faker.lorem.word()
          payload.textValue = text
          break
        }
        case 'number': {
          let num = 0
          if (fieldDef.fakerRule === 'number.int') num = faker.number.int({ min: 1, max: 1000 })
          // Candidate Rating special case
          if (fieldDef.name === 'Rating') num = faker.number.int({ min: 1, max: 5 })
          payload.numberValue = num
          break
        }
        case 'date': {
          let d = new Date()
          if (fieldDef.fakerRule === 'date.future') d = faker.date.future()
          else if (fieldDef.fakerRule === 'date.past') d = faker.date.past()
          else if (fieldDef.fakerRule === 'date.recent') d = faker.date.recent()
          payload.dateValue = d
          break
        }
        case 'select': {
          const options = fieldIdToOptionsMap[fieldId]
          if (options && options.length > 0) {
            // Pick a random option
            payload.selectValue = faker.helpers.arrayElement(options)
          }
          break
        }
        case 'person': {
          if (userIds.length > 0) {
            payload.personValue = [faker.helpers.arrayElement(userIds)]
          }
          break
        }
      }

      await setFieldValue(record.id, fieldId, payload)
    }
  }

  console.log(`[Template] Done.`);
  if (onProgress) await onProgress(`Done`)
  await ensureDefaultView(db.id)
  return db
}
