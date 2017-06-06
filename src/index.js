const moment = require("moment")
const rp = require("request-promise")
const R = require("ramda")

const args = process.argv.slice(2)

const ACCESS_KEY = args[0]
const MONTHS_BEFORE = args[1] || 1
const API_URL = "https://api.monzo.com"

const since = moment().subtract(MONTHS_BEFORE, "months").startOf("month")
const before = moment(since).endOf("month")

reqOptions = {
  headers: {
    Authorization: `Bearer ${ACCESS_KEY}`,
  },
  json: true,
}

const calcTotalChange = ({transactions}) => {
  const totalChange = transactions.reduce((accumulated, transaction) => {
    // ignore card topups
    if (transaction.amount >= 0) return accumulated

    const majorValue = (transaction.amount / 100) * -1
    const change = parseFloat((Math.ceil(majorValue) - majorValue).toFixed(2))
    return accumulated + change
  }, 0)

  return `£${totalChange.toFixed(2)}`
}

console.log(`Change to be saved for the period ${since} to ${before}`)

rp.get(`${API_URL}/accounts`, reqOptions)
  .then(({accounts}) => {
    const accountId = accounts.pop().id
    const options = {
      qs: {
        account_id: accountId,
        since: since.toISOString(),
        before: before.toISOString(),
      }
    }
    rp.get(`${API_URL}/transactions`, R.merge(reqOptions, options))
      .then(calcTotalChange)
      .then(console.log)
  })
  .catch((resp) => {
    console.log(resp.error)
  })
