// Copyright 2017, Google, Inc.
// Licensed under the Apache License, Version 2.0 (the 'License');
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//    http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an 'AS IS' BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

'use strict';

process.env.DEBUG = 'actions-on-google:*';
const {
  dialogflow,
  DeliveryAddress,
  OrderUpdate,
  TransactionDecision,
  TransactionRequirements,
  Suggestions,
  SimpleResponse,
} = require('actions-on-google');
const functions = require('firebase-functions');

const app = dialogflow({debug: true});

const GENERIC_EXTENSION_TYPE =
  'type.googleapis.com/google.actions.v2.orders.GenericExtension';

const suggestIntents = [
  'Merchant Transaction',
  'Google Pay Transaction',
];

app.intent('Default Welcome Intent', (conv) => {
  conv.ask(new SimpleResponse({
    speech: '  Hey there! I can help you go through a transaction with Google ' +
      'Pay and Merchant-managed payments.',
    text: '  Hi there! I can help you go through a transaction with Google ' +
      'Pay and Merchant-managed payments.',
  }));
  conv.ask(new Suggestions(suggestIntents));
});

app.intent('Transaction Merchant', (conv) => {
  conv.contexts.set('merchant_pay', 5);
  conv.ask(new TransactionRequirements({
    orderOptions: {
      requestDeliveryAddress: false,
    },
    paymentOptions: {
      actionProvidedOptions: {
        displayName: 'VISA-1234',
        paymentType: 'PAYMENT_CARD',
      },
    },
  }));
});

app.intent('Transaction Google', (conv) => {
  conv.contexts.set('google_pay', 5);
  conv.ask(new TransactionRequirements({
    orderOptions: {
      requestDeliveryAddress: false,
    },
    paymentOptions: {
      googleProvidedOptions: {
        prepaidCardDisallowed: false,
        supportedCardNetworks: ['VISA', 'AMEX', 'DISCOVER', 'MASTERCARD'],
        tokenizationParameters: {
        // Tokenization parameter data will be provided by a
        // payment processor, i.e. Stripe, Braintree, Vantiv, etc.
          parameters: {
            'gateway': 'braintree',
            'braintree:sdkVersion': '1.4.0',
            'braintree:apiVersion': 'v1',
            'braintree:merchantId': 'xxxxxxxxxxx',
            'braintree:clientKey': 'sandbox_xxxxxxxxxxxxxxx',
            'braintree:authorizationFingerprint': 'sandbox_xxxxxxxxxxxxxxx',
          },
          tokenizationType: 'PAYMENT_GATEWAY',
        },
      },
    },
  }));
});

app.intent('Transaction Check Complete', (conv) => {
  const arg = conv.arguments.get('TRANSACTION_REQUIREMENTS_CHECK_RESULT');
  if (arg && arg.resultType ==='OK') {
    // Normally take the user through cart building flow
    conv.ask(`Looks like you're good to go! ` +
      `Try saying "Get Delivery Address".`);
    conv.ask(new Suggestions(['Get Delivery Address']));
  } else {
    conv.close('Transaction failed.');
  }
});

app.intent('Delivery Address', (conv) => {
  conv.ask(new DeliveryAddress({
    addressOptions: {
      reason: 'To know where to send the order',
    },
  }));
});

app.intent('Delivery Address Complete', (conv) => {
  const arg = conv.arguments.get('DELIVERY_ADDRESS_VALUE');
  if (arg.userDecision ==='ACCEPTED') {
    console.log('DELIVERY ADDRESS: ' +
    arg.location.postalAddress.addressLines[0]);
    conv.data.deliveryAddress = arg.location;
    conv.ask('Great, got your address! Now say "confirm transaction".');
    conv.ask(new Suggestions(['Confirm Transaction']));
  } else {
    conv.close('I failed to get your delivery address.');
  }
});

app.intent('Transaction Decision', (conv) => {
  // Each order needs to have a unique ID
  const UNIQUE_ORDER_ID = Math.random().toString(32).substr(2);
  conv.data.UNIQUE_ORDER_ID = UNIQUE_ORDER_ID;
  const order = {
    id: UNIQUE_ORDER_ID,
    cart: {
      merchant: {
        id: 'book_store_1',
        name: 'Book Store',
      },
      lineItems: [
        {
          name: 'My Memoirs',
          id: 'memoirs_1',
          price: {
            amount: {
              currencyCode: 'USD',
              nanos: 990000000,
              units: 3,
            },
            type: 'ACTUAL',
          },
          quantity: 1,
          subLines: [
            {
              note: 'Note from the author',
            },
          ],
          type: 'REGULAR',
        },
        {
          name: 'Memoirs of a person',
          id: 'memoirs_2',
          price: {
            amount: {
              currencyCode: 'USD',
              nanos: 990000000,
              units: 5,
            },
            type: 'ACTUAL',
          },
          quantity: 1,
          subLines: [
            {
              note: 'Special introduction by author',
            },
          ],
          type: 'REGULAR',
        },
        {
          name: 'Their memoirs',
          id: 'memoirs_3',
          price: {
            amount: {
              currencyCode: 'USD',
              nanos: 750000000,
              units: 15,
            },
            type: 'ACTUAL',
          },
          quantity: 1,
          subLines: [
            {
              lineItem: {
                name: 'Special memoir epilogue',
                id: 'memoirs_epilogue',
                price: {
                  amount: {
                    currencyCode: 'USD',
                    nanos: 990000000,
                    units: 3,
                  },
                  type: 'ACTUAL',
                },
                quantity: 1,
                type: 'REGULAR',
              },
            },
          ],
          type: 'REGULAR',
        },
        {
          name: 'Our memoirs',
          id: 'memoirs_4',
          price: {
            amount: {
              currencyCode: 'USD',
              nanos: 490000000,
              units: 6,
            },
            type: 'ACTUAL',
          },
          quantity: 1,
          subLines: [
            {
              note: 'Special introduction by author',
            },
          ],
          type: 'REGULAR',
        },
      ],
      notes: 'The Memoir collection',
      otherItems: [],
    },
    otherItems: [
      {
        name: 'Subtotal',
        id: 'subtotal',
        price: {
          amount: {
            currencyCode: 'USD',
            nanos: 220000000,
            units: 32,
          },
          type: 'ESTIMATE',
        },
        type: 'SUBTOTAL',
      },
      {
        name: 'Tax',
        id: 'tax',
        price: {
          amount: {
            currencyCode: 'USD',
            nanos: 780000000,
            units: 2,
          },
          type: 'ESTIMATE',
        },
        type: 'TAX',
      },
    ],
    totalPrice: {
      amount: {
        currencyCode: 'USD',
        nanos: 0,
        units: 35,
      },
      type: 'ESTIMATE',
    },
  };

  if (conv.data.deliveryAddress) {
    order.extension = {
      '@type': GENERIC_EXTENSION_TYPE,
      'locations': [
        {
          type: 'DELIVERY',
          location: {
            postalAddress: conv.data.deliveryAddress.postalAddress,
          },
        },
      ],
    };
  }

  if (conv.contexts.get('google_pay') != null) {
    conv.ask(new TransactionDecision({
      orderOptions: {
        requestDeliveryAddress: true,
      },
      paymentOptions: {
        googleProvidedOptions: {
          prepaidCardDisallowed: false,
          supportedCardNetworks: ['VISA', 'AMEX', 'DISCOVER', 'MASTERCARD'],
          tokenizationParameters: {
            // Tokenization parameter data  will be provided by
            // a payment processor, like Stripe, Braintree, Vantiv, etc.
            parameters: {
              'gateway': 'braintree',
              'braintree:sdkVersion': '1.4.0',
              'braintree:apiVersion': 'v1',
              'braintree:merchantId': 'xxxxxxxxxxx',
              'braintree:clientKey': 'sandbox_xxxxxxxxxxxxxxx',
              'braintree:authorizationFingerprint': 'sandbox_xxxxxxxxxxxxxxx',
            },
            tokenizationType: 'PAYMENT_GATEWAY',
          },
        },
      },
      proposedOrder: order,
    }));
  } else {
    conv.ask(new TransactionDecision({
      orderOptions: {
        requestDeliveryAddress: true,
      },
      paymentOptions: {
        actionProvidedOptions: {
          paymentType: 'PAYMENT_CARD',
          displayName: 'VISA-1234',
        },
      },
      proposedOrder: order,
    }));
  }
});

app.intent('Transaction Decision Complete', (conv) => {
  console.log('Transaction decision complete');
  const arg = conv.arguments.get('TRANSACTION_DECISION_VALUE');
  if (arg && arg.userDecision ==='ORDER_ACCEPTED') {
    const finalOrderId = arg.order.finalOrder.id;

    if (conv.contexts.get('google_pay') != null) {
      const paymentDisplayName = arg.order.paymentInfo.displayName;
    }

    conv.ask(new OrderUpdate({
      actionOrderId: finalOrderId,
      orderState: {
        label: 'Order created',
        state: 'CREATED',
      },
      lineItemUpdates: {},
      updateTime: new Date().toISOString(),
      receipt: {
        confirmedActionOrderId: conv.data.UNIQUE_ORDER_ID,
      },
      orderManagementActions: [
        {
          button: {
            openUrlAction: {
              // Replace the URL with your own customer service page
              url: 'http://example.com/customer-service',
            },
            title: 'Customer Service',
          },
          type: 'CUSTOMER_SERVICE',
        },
      ],
      userNotification: {
        text: 'Notification text.',
        title: 'Notification Title',
      },
    }));
    conv.ask(`Transaction completed! Your order ${conv.data.UNIQUE_ORDER_ID} is all set!`);
  } else if (arg && arg.userDecision === 'DELIVERY_ADDRESS_UPDATED') {
    conv.ask(new DeliveryAddress({
      addressOptions: {
        reason: 'To know where to send the order',
      },
    }));
  } else {
    conv.close('Transaction failed.');
  }
});

exports.dialogflowFirebaseFulfillment = functions.https.onRequest(app);
