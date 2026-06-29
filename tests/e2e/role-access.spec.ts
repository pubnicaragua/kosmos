import { APIRequestContext, expect, test } from '@playwright/test'

type Credentials = {
  key: 'superAdmin' | 'manager' | 'user'
  email: string
  password: string
}

type LoginData = {
  accessToken: string
  user: { id: string; email: string; name: string }
  companies: Array<{
    id: string
    name: string
    isActive: boolean
    role: 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'USER' | string
    logo?: string | null
  }>
}

const credentialMatrix: Credentials[] = [
  {
    key: 'superAdmin',
    email: process.env.QA_SUPER_ADMIN_EMAIL || 'admin@kosmoscrm.com',
    password: process.env.QA_SUPER_ADMIN_PASSWORD || 'admin123',
  },
  {
    key: 'manager',
    email: process.env.QA_MANAGER_EMAIL || 'manager@kosmoscrm.com',
    password: process.env.QA_MANAGER_PASSWORD || 'manager123',
  },
  {
    key: 'user',
    email: process.env.QA_USER_EMAIL || 'user@kosmoscrm.com',
    password: process.env.QA_USER_PASSWORD || 'user123',
  },
]

async function login(request: APIRequestContext, credentials: Credentials): Promise<LoginData> {
  const res = await request.post('/api/auth/login', {
    data: {
      email: credentials.email,
      password: credentials.password,
      rememberMe: false,
    },
  })

  const body = await res.json()
  expect(res.status(), `login failed for ${credentials.key}: ${JSON.stringify(body)}`).toBe(200)
  expect(body.success).toBeTruthy()

  return body.data as LoginData
}

async function profile(request: APIRequestContext, token: string) {
  const res = await request.get('/api/profiles/current', {
    headers: { Authorization: `Bearer ${token}` },
  })
  const body = await res.json()
  expect(res.status(), JSON.stringify(body)).toBe(200)
  expect(body.success).toBeTruthy()
  return body.data as {
    user: { id: string; email: string; name: string }
    companies: Array<{ id: string; name: string; role: string }>
  }
}

test.describe('RBAC + multi-company API QA', () => {
  test('all role credentials authenticate and role coverage is complete', async ({ request }) => {
    const observedRoles = new Set<string>()

    for (const creds of credentialMatrix) {
      const auth = await login(request, creds)
      expect(auth.accessToken).toBeTruthy()
      expect(auth.companies.length).toBeGreaterThan(0)

      const current = await profile(request, auth.accessToken)
      expect(current.user.email).toBe(creds.email)
      expect(current.companies.length).toBeGreaterThan(0)

      for (const company of current.companies) {
        observedRoles.add(company.role)
      }
    }

    expect([...observedRoles].sort()).toEqual(
      expect.arrayContaining(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'USER'])
    )
  })

  test('single-company user cannot access data from an unassigned company', async ({ request }) => {
    const superAdminAuth = await login(request, credentialMatrix[0])
    const userAuth = await login(request, credentialMatrix[2])

    const userProfile = await profile(request, userAuth.accessToken)
    const userCompanyIds = new Set(userProfile.companies.map((c) => c.id))

    const companiesRes = await request.get('/api/companies', {
      headers: { Authorization: `Bearer ${superAdminAuth.accessToken}` },
    })
    const companiesBody = await companiesRes.json()
    expect(companiesRes.status(), JSON.stringify(companiesBody)).toBe(200)

    const inaccessibleCompany = (companiesBody.data as Array<{ id: string }>).find(
      (company) => !userCompanyIds.has(company.id)
    )

    expect(inaccessibleCompany, 'no inaccessible company found for USER test').toBeTruthy()

    const deniedCompanyRes = await request.get(`/api/companies/${inaccessibleCompany!.id}`, {
      headers: { Authorization: `Bearer ${userAuth.accessToken}` },
    })
    expect(deniedCompanyRes.status()).toBe(403)

    const deniedIncomesRes = await request.get(`/api/incomes?companyId=${inaccessibleCompany!.id}`, {
      headers: { Authorization: `Bearer ${userAuth.accessToken}` },
    })
    expect(deniedIncomesRes.status()).toBe(403)
  })

  test('company update endpoint honors role permissions (200 for SUPER_ADMIN/ADMIN, 403 for MANAGER/USER)', async ({ request }) => {
    const roleCases: Array<{ role: string; token: string; companyId: string }> = []

    for (const creds of credentialMatrix) {
      const auth = await login(request, creds)
      const current = await profile(request, auth.accessToken)
      for (const company of current.companies) {
        if (!roleCases.find((rc) => rc.role === company.role)) {
          roleCases.push({ role: company.role, token: auth.accessToken, companyId: company.id })
        }
      }
    }

    for (const roleName of ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'USER']) {
      const found = roleCases.find((c) => c.role === roleName)
      expect(found, `missing role case for ${roleName}`).toBeTruthy()
    }

    for (const roleCase of roleCases) {
      const detailsRes = await request.get(`/api/companies/${roleCase.companyId}`, {
        headers: { Authorization: `Bearer ${roleCase.token}` },
      })
      const detailsBody = await detailsRes.json()
      expect(detailsRes.status(), JSON.stringify(detailsBody)).toBe(200)

      const payload = {
        name: detailsBody.data.name,
        industry: detailsBody.data.industry,
        logo: detailsBody.data.logo,
        isActive: detailsBody.data.isActive,
      }

      const updateRes = await request.put(`/api/companies/${roleCase.companyId}`, {
        headers: { Authorization: `Bearer ${roleCase.token}` },
        data: payload,
      })

      if (roleCase.role === 'SUPER_ADMIN' || roleCase.role === 'ADMIN') {
        expect(updateRes.status(), `role ${roleCase.role} should be allowed`).toBe(200)
      } else {
        expect(updateRes.status(), `role ${roleCase.role} should be denied`).toBe(403)
      }
    }
  })

  test('core modules respond with authorized company scope for all baseline users', async ({ request }) => {
    const moduleRoutes = [
      '/api/dashboard/summary',
      '/api/incomes',
      '/api/expenses',
      '/api/activities',
      '/api/clients',
      '/api/opportunities',
      '/api/documents',
      '/api/contracts',
      '/api/products',
      '/api/tickets',
      '/api/marketing',
      '/api/employees',
      '/api/payrolls',
    ]

    for (const creds of credentialMatrix) {
      const auth = await login(request, creds)
      const current = await profile(request, auth.accessToken)
      const companyId = current.companies[0]?.id
      expect(companyId).toBeTruthy()

      for (const route of moduleRoutes) {
        const scopedUrl = `${route}?companyId=${companyId}`
        const res = await request.get(scopedUrl, {
          headers: { Authorization: `Bearer ${auth.accessToken}` },
        })
        const status = res.status()
        expect(
          status,
          `${creds.key} failed route ${scopedUrl} with status ${status}`
        ).toBe(200)
      }
    }
  })
})
