/*
 * Privacy-redacting MQTT boundary probe for the official iLetComfort Android app.
 *
 * Hook points:
 *  - Eclipse Paho MqttAsyncClient publish/subscribe methods
 *  - AWSIotMqttManager publish/subscribe wrappers, where present
 *  - Paho CommsCallback inbound application messages
 *
 * It intentionally does NOT print full JSON payloads, account identifiers,
 * passwords, certificates, private keys, serial numbers or tokens. It reports
 * messageType, JSON keys, commandHex, selected heating/temperature fields and
 * topic shapes with long numeric identifiers redacted.
 *
 * Run only on your own device/session. Do not upload captures to a public issue.
 */

'use strict';

Java.perform(function () {
  const JavaString = Java.use('java.lang.String');
  const hookStats = { installed: 0, missingClasses: [], missingMethods: [] };

  function clsName(value) {
    try {
      if (value === null || value === undefined) return 'null';
      if (value.$className) return value.$className;
      return value.getClass().getName().toString();
    } catch (_) {
      return typeof value;
    }
  }

  function toText(value) {
    try {
      if (value === null || value === undefined) return null;
      return value.toString();
    } catch (_) {
      return null;
    }
  }

  function byteArrayText(value) {
    try {
      return JavaString.$new(value, 'UTF-8').toString();
    } catch (_) {
      try {
        let hex = '';
        for (let i = 0; i < value.length && i < 256; i++) {
          let b = value[i];
          if (b < 0) b += 256;
          hex += ('0' + b.toString(16)).slice(-2);
        }
        return hex;
      } catch (_) {
        return null;
      }
    }
  }

  function messagePayload(value) {
    if (value === null || value === undefined) return null;
    const name = clsName(value);
    try {
      if (name.indexOf('MqttMessage') >= 0 && typeof value.getPayload === 'function') {
        return byteArrayText(value.getPayload());
      }
      if (name === '[B') return byteArrayText(value);
      if (name === 'java.lang.String' || typeof value === 'string') return toText(value);
    } catch (_) {}
    return null;
  }

  function safeTopic(topic) {
    if (!topic) return null;
    return String(topic)
      .replace(/[0-9]{8,}/g, function (n) { return '<id:' + n.length + 'digits>'; })
      .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/ig, '<email>');
  }

  function safePrimitive(value) {
    return value === null || typeof value === 'string' ||
      typeof value === 'number' || typeof value === 'boolean';
  }

  function payloadSummary(raw) {
    if (raw === null || raw === undefined) return { format: 'no-payload' };
    const text = String(raw);
    try {
      const obj = JSON.parse(text);
      const rootKeys = Object.keys(obj).sort().slice(0, 40);
      const data = obj && typeof obj.data === 'object' && obj.data !== null ? obj.data : {};
      const dataKeys = Object.keys(data).sort().slice(0, 60);
      const candidateFields = {};
      const candidateKey = /(temp|temperature|outdoor|water|tank|dhw|zone|heat|target|setpoint|set_temp|mode|power|onoff|curve|control)/i;
      const sensitiveKey = /(password|token|secret|cert|private|serial|appliance(code|sn)|account|email|username|user(id)?|device(id)?|mac|key)/i;
      Object.keys(data).sort().forEach(function (key) {
        if (sensitiveKey.test(key) || !candidateKey.test(key)) return;
        const val = data[key];
        if (safePrimitive(val) && (typeof val !== 'string' || val.length <= 64)) {
          candidateFields[key.slice(0, 64)] = val;
        }
      });
      const result = {
        format: 'json',
        messageType: typeof obj.messageType === 'string' ? obj.messageType : null,
        rootKeys: rootKeys,
        dataKeys: dataKeys,
        candidateFields: candidateFields
      };
      if (typeof data.commandHex === 'string' &&
          /^[0-9a-fA-F]{2,512}$/.test(data.commandHex) &&
          data.commandHex.length % 2 === 0) {
        result.commandHex = data.commandHex.toLowerCase();
      }
      if (typeof obj.commandHex === 'string' &&
          /^[0-9a-fA-F]{2,512}$/.test(obj.commandHex) &&
          obj.commandHex.length % 2 === 0) {
        result.commandHex = obj.commandHex.toLowerCase();
      }
      return result;
    } catch (_) {
      const compact = text.trim();
      if (/^(?:[0-9a-fA-F]{2}){1,256}$/.test(compact)) {
        return { format: 'hex-frame', length: compact.length / 2, frameHex: compact.toLowerCase() };
      }
      return { format: 'other', length: text.length };
    }
  }

  function record(event, api, method, args, topicOverride, payloadOverride) {
    try {
      let topic = topicOverride || null;
      if (!topic && args && args.length > 0) {
        const first = args[0];
        const firstClass = clsName(first);
        if (firstClass === '[Ljava.lang.String;') {
          const topics = [];
          for (let i = 0; i < first.length && i < 12; i++) {
            topics.push(safeTopic(toText(first[i])));
          }
          topic = topics;
        } else {
          topic = safeTopic(toText(first));
        }
      }

      let payload = payloadOverride || null;
      if (!payload && args) {
        for (let i = 1; i < args.length; i++) {
          const candidate = messagePayload(args[i]);
          if (candidate !== null) {
            payload = payloadSummary(candidate);
            break;
          }
        }
      }

      console.log('[ILETCOMFORT-MQTT] ' + JSON.stringify({
        event: event,
        api: api,
        method: method,
        topic: topic,
        payload: payload
      }));
    } catch (_) {
      console.log('[ILETCOMFORT-MQTT] ' + JSON.stringify({
        event: event, api: api, method: method, note: 'metadata-only fallback'
      }));
    }
  }

  function hookMethod(className, methodName, apiName, eventName) {
    let klass;
    try {
      klass = Java.use(className);
    } catch (_) {
      hookStats.missingClasses.push(className);
      return;
    }

    let group;
    try {
      group = klass[methodName];
    } catch (_) {
      hookStats.missingMethods.push(className + '.' + methodName);
      return;
    }
    if (!group || !group.overloads || group.overloads.length === 0) {
      hookStats.missingMethods.push(className + '.' + methodName);
      return;
    }

    group.overloads.forEach(function (overload) {
      const original = overload;
      const signature = original.argumentTypes.map(function (t) { return t.className; }).join(',');
      original.implementation = function () {
        const args = Array.prototype.slice.call(arguments);
        try {
          record(eventName, apiName, methodName + '(' + signature + ')', args);
        } catch (_) {}
        return original.apply(this, args);
      };
      hookStats.installed += 1;
    });
  }

  function hookInboundPaho() {
    const cls = 'org.eclipse.paho.client.mqttv3.internal.CommsCallback';
    let klass;
    try {
      klass = Java.use(cls);
    } catch (_) {
      hookStats.missingClasses.push(cls);
      return;
    }
    ['handleMessage', 'messageArrived'].forEach(function (methodName) {
      let group;
      try { group = klass[methodName]; } catch (_) { return; }
      if (!group || !group.overloads) return;
      group.overloads.forEach(function (overload) {
        const original = overload;
        original.implementation = function () {
          const args = Array.prototype.slice.call(arguments);
          try {
            const publish = args.find(function (arg) {
              return clsName(arg).indexOf('MqttPublish') >= 0;
            });
            if (publish) {
              const topic = toText(publish.getTopicName());
              const msg = publish.getMessage();
              const raw = msg ? messagePayload(msg) : null;
              record('inbound', 'paho', methodName, [], safeTopic(topic),
                raw === null ? null : payloadSummary(raw));
            }
          } catch (_) {}
          return original.apply(this, args);
        };
        hookStats.installed += 1;
      });
    });
  }

  [
    ['org.eclipse.paho.client.mqttv3.MqttAsyncClient', 'publish', 'paho', 'outbound'],
    ['org.eclipse.paho.client.mqttv3.MqttAsyncClient', 'subscribe', 'paho', 'subscribe'],
    ['com.amazonaws.mobileconnectors.iot.AWSIotMqttManager', 'publishString', 'aws-iot', 'outbound'],
    ['com.amazonaws.mobileconnectors.iot.AWSIotMqttManager', 'publishData', 'aws-iot', 'outbound'],
    ['com.amazonaws.mobileconnectors.iot.AWSIotMqttManager', 'publish', 'aws-iot', 'outbound'],
    ['com.amazonaws.mobileconnectors.iot.AWSIotMqttManager', 'subscribeToTopic', 'aws-iot', 'subscribe'],
    ['com.amazonaws.mobileconnectors.iot.AWSIotMqttManager', 'subscribe', 'aws-iot', 'subscribe']
  ].forEach(function (item) {
    hookMethod(item[0], item[1], item[2], item[3]);
  });
  hookInboundPaho();

  console.log('[ILETCOMFORT-MQTT] hooks-ready ' + JSON.stringify({
    installedOverloads: hookStats.installed,
    missingClasses: hookStats.missingClasses,
    missingMethods: hookStats.missingMethods
  }));
});
