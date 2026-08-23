# CityResolve AI Implementation Guide

## Overview

CityResolve AI is a civic issue management application built around a single, accountable issue record. Citizens can submit and follow a local issue, field officers can act on their own assigned work, and administrators can manage service operations, staff assignments, analytics, and the issue map. The application uses the platform-provided React, TypeScript, tRPC, MySQL, and object-storage capabilities.

## Roles and access boundaries

| Role | Permitted workspace | Server-side restrictions |
| --- | --- | --- |
| **Citizen** | Personal reports, new issue submission, and personal notifications. | Can only create reports and view or attach photos to reports they submitted. |
| **Officer** | Assigned field queue and personal notifications. | Can only view issues assigned to their account and change them to **In Progress** or **Resolved**. |
| **Admin** | Operations dashboard, issue map, operational analytics, and personal notifications. | Can view every issue, update any permitted status or priority, and assign officers. |

The role check runs in server procedures as well as in the interface. A direct visit to another role’s route therefore does not grant access to protected data or actions.

## Issue lifecycle

CityResolve uses the following fixed status vocabulary.

| Status | Meaning | Controlled by |
| --- | --- | --- |
| **Pending** | The issue has been submitted and is awaiting triage or assignment. | Citizen submission or administrator |
| **In Progress** | A field officer has started work on an assigned issue. | Assigned officer or administrator |
| **Resolved** | The field work is complete and a resolution note may be recorded. | Assigned officer or administrator |
| **Closed** | The city has formally concluded the service request. | Administrator |

## Photo attachments and issue locations

Citizens can attach up to four JPG, PNG, or WebP photos, each limited to 5 MB. The server validates file type and size, then stores the file in object storage while keeping only the storage reference and metadata in the database. The issue submission form also accepts optional latitude and longitude values. Administrators see saved coordinates on the map as markers coloured by issue status.

## AI assistance

The citizen reporting form offers a category and priority recommendation after a sufficiently detailed description has been entered. The server requests structured output from the built-in AI service and validates the response against the application’s permitted category and priority values. If the service is unavailable or its response is unusable, the application falls back to a transparent keyword-based recommendation so the form remains usable. The citizen always retains control of the final selected values.

When the first eligible photo is added to a citizen report, CityResolve also performs a vision-based suggestion. It can prefill a neutral title, a visible-condition description, category, and priority, then clearly labels the result for review. A photo is never used to infer a ward, street address, GPS coordinate, identity, licence plate, or other sensitive information. Citizens must enter and confirm the location fields themselves before submission. If the service cannot return a usable analysis, the form remains available for normal manual completion.

For photos that already contain embedded GPS metadata, the reporting form reads those coordinates in the browser and asks the server to reverse-geocode them into editable latitude, longitude, location, and ward suggestions. The feature does not estimate a location from scene content. When no embedded GPS is present—which is common after sharing or editing a photo—the form clearly explains that the citizen must complete the location fields manually. Existing typed location values are not overwritten.

When the first uploaded photo has no embedded GPS, CityResolve requests the browser’s permission to use the current location of the uploading device. Only after the citizen approves this prompt are the device coordinates reverse-geocoded into the same editable ward, location, latitude, and longitude suggestions. If permission is refused, unavailable, or times out, no location is added and the citizen can either type the details or retry the permission prompt. Location is never silently collected.

## Operational setup

Newly registered accounts receive the **Citizen** role. The project owner is automatically given the **Admin** role. An administrator can promote a verified staff account to **Officer** with the project database management interface; that account will then appear in the administrator assignment selector after signing in. No sample residents, officers, reports, reviews, or ratings are created by the application.

## Verification

The project includes a Vitest workflow suite. It confirms the allowed officer status transitions and the deterministic AI-suggestion fallback. TypeScript compilation is checked with `pnpm check`.

The public experience was also reviewed at desktop and mobile viewport widths. The landing page preserves its readable hierarchy, two-action call to action, and service-flow panel while moving cleanly to a stacked mobile composition.
