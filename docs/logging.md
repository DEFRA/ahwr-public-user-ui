# Logging

## Enforced Structure

Logging needs to implemement the [Elastic Common Schema](https://www.elastic.co/guide/en/ecs/current/index.html) (ECS).

## Current Streamlined ECS Schema on CDP

> [!NOTE]
> This list was lasted updated on 10/04/2025.

<!-- markdownlint-disable MD013 -->

| Legend | Description                                                                                                          |
| ------ | -------------------------------------------------------------------------------------------------------------------- |
| ❌     | These fields are CDP reserved. Values in these fields will be overridden by the log ingestion pipeline               |
| ✅⚠️   | Node - If the log contains `req` or `res`, these fields will be overridden with values extracted from these objects. |
| ✅     | These fields can be set by tenants.                                                                                  |

> [!NOTE]
> In the ingestion pipeline, flattened keys and keys in a map are not considered the same. Using flattened keys when
> nested are expected and vice versa will cause the field to not show in opensearch. i.e `a/b = {"a":{"b":"value"}}` and
> `a.b = {"a.b": "value"}`.

| **Field**                              | **Type** | **Definable** | **Description**                                                          |
| -------------------------------------- | -------- | ------------- | ------------------------------------------------------------------------ |
| `@ingestion_timestamp`                 | `date`   | ❌            | The time the event was ingested into the system.                         |
| `@timestamp`                           | `date`   | ❌            | The time the event occurred (event time).                                |
| `amazon/trace.id`                      | `text`   | ❌            | Unique identifier for the trace, typically used for distributed tracing. |
| `cdp-uploader/fileId`                  | `text`   | ❌            | File ID related to the CDP uploader process.                             |
| `cdp-uploader/fileIds`                 | `text`   | ❌            | Array of file IDs uploaded via CDP.                                      |
| `cdp-uploader/uploadId`                | `text`   | ❌            | Identifier for the upload.                                               |
| `cdp-uploader/uploadStatus`            | `text`   | ❌            | Can be initiated, pending, or ready.                                     |
| `client/address`                       | `text`   | ✅⚠️          | Client address (IP or hostname).                                         |
| `client/ip`                            | `text`   | ✅⚠️          | IP address of the client.                                                |
| `client/port`                          | `long`   | ✅⚠️          | Network port of the client.                                              |
| `container_id`                         | `text`   | ❌            | ID of the container (e.g., Docker ID).                                   |
| `container_name`                       | `text`   | ❌            | Name of the container.                                                   |
| `date`                                 | `float`  | ❌            | Custom or general event date.                                            |
| `ecs.version`                          | `text`   | ❌            | Version of the ECS schema used.                                          |
| `ecs_cluster`                          | `text`   | ❌            | Name of the ECS (Elastic Container Service) cluster.                     |
| `ecs_task_arn`                         | `text`   | ❌            | Amazon Resource Name (ARN) of the ECS task.                              |
| `ecs_task_definition`                  | `text`   | ❌            | ECS task definition used to run the container.                           |
| `error/code`                           | `text`   | ✅            | Numeric or symbolic error code.                                          |
| `error/id`                             | `text`   | ✅            | Unique identifier for the error instance.                                |
| `error/message`                        | `text`   | ✅            | Descriptive error message.                                               |
| `error/stack_trace`                    | `text`   | ✅            | Full error stack trace.                                                  |
| `error/type`                           | `text`   | ✅            | Error class or type.                                                     |
| `event/action`                         | `text`   | ✅            | Specific action taken or observed (e.g., user_login).                    |
| `event/category`                       | `text`   | ✅            | Broad category of the event.                                             |
| `event/created`                        | `date`   | ✅            | Time the event was created in the system.                                |
| `event/duration`                       | `long`   | ✅            | Total time of the event in nanoseconds.                                  |
| `event/kind`                           | `text`   | ✅            | High-level type of the event.                                            |
| `event/outcome`                        | `text`   | ✅            | Outcome of the event.                                                    |
| `event/reason`                         | `text`   | ✅            | Reason or explanation for the event outcome.                             |
| `event/reference`                      | `text`   | ✅            | A reference ID or URL tied to the event.                                 |
| `event/severity`                       | `long`   | ✅            | Custom or ECS severity level (0–10).                                     |
| `event/type`                           | `text`   | ✅            | Type of event.                                                           |
| `host.hostname`                        | `text`   | ✅            | Hostname of the system where the event happened.                         |
| `http/request/body/bytes`              | `long`   | ✅            | Size in bytes of the HTTP request body.                                  |
| `http/request/bytes`                   | `long`   | ✅            | Total size in bytes of the HTTP request.                                 |
| `http/request/headers/Accept-language` | `text`   | ✅            | Languages accepted by the requester.                                     |
| `http/request/headers/accept-encoding` | `text`   | ✅            | Encoding formats accepted.                                               |
| `http/request/headers/cache-control`   | `text`   | ✅            | Cache control directives.                                                |
| `http/request/headers/expires`         | `text`   | ✅            | Expiration date from HTTP headers.                                       |
| `http/request/headers/referer`         | `text`   | ✅            | Referring URL in the request.                                            |
| `http/request/id`                      | `text`   | ✅            | Unique identifier of the HTTP request.                                   |
| `http/request/method`                  | `text`   | ✅⚠️          | HTTP method used.                                                        |
| `http/response/body/bytes`             | `long`   | ❌            | Size of the HTTP response body in bytes.                                 |
| `http/response/bytes`                  | `long`   | ❌            | Total response size in bytes.                                            |
| `http/response/mime_type`              | `text`   | ❌            | MIME type of the HTTP response.                                          |
| `http/response/response_time`          | `long`   | ❌            | Time taken to serve the HTTP response.                                   |
| `http/response/status_code`            | `long`   | ✅⚠️          | HTTP status code.                                                        |
| `log.level`                            | `text`   | ✅            | Log severity.                                                            |
| `log/file/path`                        | `text`   | ✅            | Path to the log file.                                                    |
| `log/logger`                           | `text`   | ✅            | Name of the logger or logging library.                                   |
| `message`                              | `text`   | ✅            | Original log message.                                                    |
| `process/name`                         | `text`   | ✅            | Name of the process.                                                     |
| `process/pid`                          | `long`   | ✅            | Process ID.                                                              |
| `process/thread/id`                    | `long`   | ✅            | ID of the process thread.                                                |
| `process/thread/name`                  | `text`   | ✅            | Name of the thread (if available).                                       |
| `server/address`                       | `text`   | ✅⚠️          | IP or hostname of the server.                                            |
| `service/name`                         | `text`   | ❌            | Name of the running service.                                             |
| `service/type`                         | `text`   | ✅            | Type of the service.                                                     |
| `service/version`                      | `text`   | ❌            | Version of the service.                                                  |
| `source`                               | `text`   | ❌            | Where the log is from (e.g., stdout, stderr)                             |
| `span.id`                              | `text`   | ✅            | Unique span ID for tracing.                                              |
| `tenant/id`                            | `text`   | ✅            | Tenant or customer ID.                                                   |
| `tenant/message`                       | `text`   | ✅            | Custom message related to tenant context.                                |
| `trace.id`                             | `text`   | ❌            | Unique trace identifier. See [Tracing](tracing.md) doc                   |
| `transaction.id`                       | `text`   | ✅            | ID of the transaction.                                                   |
| `url/domain`                           | `text`   | ✅            | Domain portion of the URL.                                               |
| `url/full`                             | `text`   | ✅            | Full URL as seen in the request.                                         |
| `url/path`                             | `text`   | ✅⚠️          | Path component of the URL.                                               |
| `url/port`                             | `long`   | ✅⚠️          | Port number in the URL.                                                  |
| `url/query`                            | `text`   | ✅            | Query string portion of the URL.                                         |
| `user_agent/device/name`               | `text`   | ✅            | User agent device name                                                   |
| `user_agent/name`                      | `text`   | ✅            | User agent short name                                                    |
| `user_agent/original`                  | `text`   | ✅⚠️          | Full original user agent string.                                         |
| `user_agent/version`                   | `text`   | ✅            | User agent version.                                                      |

<!-- markdownlint-enable MD013 -->
