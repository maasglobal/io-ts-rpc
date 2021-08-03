# io-ts-rpc

Io-ts-rpc is an RPC client that uses [io-ts](https://github.com/gcanti/io-ts) codecs. For decoding input and encoding output. The codecs themself are described in greater detail in the [io-ts guide](https://github.com/gcanti/io-ts/blob/master/index.md). If you have existing JSON Hyper Schema definitions for your endpoints you can use [io-ts-from-json-schema](https://www.npmjs.com/package/io-ts-from-json-schema) to convert your hyper schema into io-ts endpoint definitions. Complementary [io-ts-validator](https://www.npmjs.com/package/io-ts-validator) provides convenience features for using the same codecs for validating non-network related inputs.

## Usage Example

```Shell
# Create a Project
mkdir example && cd example
npm init -f && npm install --peer fp-ts io-ts-rpc io-ts io-ts-types

# Create a Schema File
mkdir -p ./schemas/examples && echo '{
  "$id": "http://example.com/iotsfjs/examples/fetch-user-endpoint.json",
  "description": "Example fetch user endpoint schema",
  "definitions": {

    "userId": {
      "description": "Unique user identifier",
      "type": "string",
      "pattern": "^user:[A-Fa-f0-9]{8}(-[A-Fa-f0-9]{4}){3}-[A-Fa-f0-9]{12}$",
      "examples": [
        "user:1c532911-acc2-4a55-ba0b-67b40439d990"
      ]
    },

    "userName": {
      "description": "Human-readable name of the user",
      "type": "string",
      "examples": [
        "Joe User"
      ]
    },

    "user": {
      "type": "object",
      "properties": {
        "id": {
          "$ref": "#/definitions/userId"
        },
        "name": {
          "$ref": "#/definitions/userName"
        }
      },
      "required": ["id", "name"],
      "additionalProperties": false,
      "examples": [
        {
          "id": "user:1c532911-acc2-4a55-ba0b-67b40439d990",
          "name": "Joe User"
        }
      ]
    },

    "requestPayload": {
      "type": "object",
      "additionalProperties": false,
      "required": ["userId"],
      "properties": {
        "userId": {
          "$ref": "#/definitions/userId"
        }
      }
    },

    "request": {
      "oneOf": [{ "$ref": "#/definitions/requestPayload" }],
      "examples": [
        {
          "userId": "user:1c532911-acc2-4a55-ba0b-67b40439d990"
        }
      ]
    },

    "unknownUser": {
      "description": "The system has no information about the requested user",
      "type": "null",
      "default": null
    },

    "responsePayload": {
      "type": "object",
      "additionalProperties": false,
      "required": ["user"],
      "properties": {
        "user": {
          "oneOf": [
            { "$ref": "#/definitions/user" },
            { "$ref": "#/definitions/unknownUser" }
          ]
        }
      }
    },

    "dataResponse": {
      "type": "object",
      "properties": { "data": { "$ref": "#/definitions/responsePayload" } },
      "required": ["data"],
      "additionalProperties": false
    },

    "errorCode": {
      "description": "Unique error identifier",
      "type": "string",
      "pattern": "^error:[A-Fa-f0-9]{8}(-[A-Fa-f0-9]{4}){3}-[A-Fa-f0-9]{12}$",
      "examples": [
        "error:1c532911-acc2-4a55-ba0b-67b40439d990"
      ]
    },

    "errorResponse": {
      "type": "object",
      "properties": { "error": { "$ref": "#/definitions/errorCode" } },
      "required": ["error"],
      "additionalProperties": false
    },

    "response": {
      "oneOf": [
        { "$ref": "#/definitions/dataResponse" },
        { "$ref": "#/definitions/errorResponse" }
      ],
      "examples": [
        {
          "data": {
            "user": {
              "id": "user:1c532911-acc2-4a55-ba0b-67b40439d990",
              "name": "Joe User"
            }
          }
        },
        { "data": { "user": null } },
        { "error": "error:1c532911-acc2-4a55-ba0b-67b40439d990" }
      ]
    },

    "apiUrl": {
      "description": "has to start https:// or http://localhost:1234/, has to end with slash",
      "type": "string",
      "pattern": "^(https://[^\\s]+|http://localhost:1234(/[^\\s]+)*)/$",
      "examples": [
        "https://example.com/iotsfjs/api/",
        "http://localhost:1234/api/"
      ]
    },

    "httpMethod": {
      "enum": ["POST"]
    },

    "httpMethodPOST": {
      "allOf": [{ "$ref": "#/definitions/httpMethod" }],
      "const": "POST",
      "default": "POST"
    },

    "contentType": {
      "enum": ["application/json"]
    },

    "contentTypeJSON": {
      "allOf": [{ "$ref": "#/definitions/contentType" }],
      "const": "application/json",
      "default": "application/json"
    }

  },

  "links": [
    {
      "rel": "implementation",

      "href": "{+apiUrl}user/{userId}/fetch",
      "hrefSchema": {
        "type": "object",
        "properties": {
          "apiUrl": { "$ref": "#/definitions/apiUrl" },
          "userId": { "$ref": "#/definitions/userId" }
        },
        "required": ["apiUrl", "userId"],
        "additionalProperties": false
      },

      "headerSchema": {
        "content-type": {
          "$ref": "#/definitions/contentTypeJSON"
        }
      },
      "submissionSchema": { "$ref": "#/definitions/request" },

      "targetHints": {
        "content-type": ["application/json"],
        "allow": ["POST"]
      },
      "targetSchema": { "$ref": "#/definitions/response" }
    }
  ]

}' > ./schemas/examples/fetch-user-endpoint.json

# Generate TypeScript Code
npm install --dev io-ts-from-json-schema typescript
./node_modules/.bin/iotsfjs --maskNull --inputFile 'schemas/**/*.json' --outputDir src --base http://example.com/iotsfjs/

# Generate Tests
npm install --dev jest @types/jest doctest-ts ts-jest fp-ts io-ts-rpc io-ts io-ts-types io-ts-validator node-fetch url-template
./node_modules/.bin/ts-jest config:init
./node_modules/.bin/doctest-ts --jest `find src -name '*.ts'`

# Run Tests
./node_modules/.bin/jest --testPathPattern --testMatch **/*.doctest.ts --roots src/

# Create RPC Client
echo "
import fetch from 'node-fetch'
import * as rpc from 'io-ts-rpc'
import { validator } from 'io-ts-validator'

import * as hyperSchema from './fetch-user-endpoint'

import {
  defaultContentTypeJSON as CONTENT_TYPE_JSON,
  defaultHttpMethodPOST as POST,
  ErrorResponse,
  UserId,
  User,
  Null
} from './fetch-user-endpoint'

const endpoint = rpc.endpointFromHyperSchema(hyperSchema);

export async function fetchUser(userId: UserId): Promise<User|null> {

  const urlVariables = await validator(endpoint.HrefTemplateVariables, 'strict').decodePromise({
    apiUrl: 'http://localhost:1234/api/',
    userId
  })
  const requestHeaders = await validator(endpoint.RequestHeaders, 'strict').decodePromise({
    'content-type': CONTENT_TYPE_JSON
  })
  const request = await validator(endpoint.Request, 'strict').decodePromise({
    userId 
  })

  const tunnel = rpc.tunnel(POST, urlVariables, requestHeaders, endpoint, fetch)
  const task = tunnel(request)
  const result = await task()

  if (result._tag === 'Left'){
    throw new Error('rpc error: ' + result.left)
  }
  if (ErrorResponse.is(result.right)) {
    throw new Error('application error: ' + result.right.error)
  }
  if (Null.is(result.right.data.user)) {
    return null     
  }
  return result.right.data.user

}
" > ./src/examples/fetch-user-client.ts

# Create Test Server
npm install --dev fp-ts io-ts-rpc io-ts io-ts-types io-ts-validator express express-pino-logger @types/assert
echo "
import assert = require('assert')
import express = require('express')
import pino = require('express-pino-logger')
import { validator } from 'io-ts-validator'

import {
  Request,
  Response,
  examplesUser
} from './fetch-user-endpoint'

const logger = pino();
const app = express();
app.use(logger);
app.use(
  express.urlencoded({
    extended: true,
  }),
);
app.use(express.json());

app.post('/api/user/:userId/fetch', (req, res) => {

  // input validation
  const { userId } = validator(Request).decodeSync(req.body)

  // sanity check
  assert.strictEqual(userId, req.params.userId)

  // application logic
  const [match] = examplesUser.filter(({id}) => id === userId)

  // constructing a response
  const response = validator(Response, 'strict').decodeSync({
    data: { user: match ?? null }
  })

  // output encoding
  const body = validator(Response).encodeSync(response)

  // *boom*
  res.send(body)

});

app.listen(1234);
" > ./src/examples/fetch-user-server.ts

# Compile TypeScript Code
./node_modules/.bin/tsc -d --rootDir src src/examples/fetch-user-{endpoint,client,server}.ts --outDir lib/

# Start Test Server
node lib/examples/fetch-user-server.js &

# Perform Test Call
node --eval "require('./lib/examples/fetch-user-client').fetchUser('user:1c532911-acc2-4a55-ba0b-67b40439d990').then(console.log)"

# Stop Test Server
kill -9 %-
```

