param input: OnPaymentCapture

let isExample = input.payment.providerKey == 'example-provider' and input.capture.state == 'pending'
let amount = input.capture.remainingAmount
let shouldSchedule = isExample and amount > 0

from shouldSchedule match
  true |> [{
    effect = 'scheduleJob'
    definition = 'apps/skill-examples/capture-request'
    parameters = {
      externalReference = input.payment.externalReference
      amount = amount
    }
  }]
  |> []