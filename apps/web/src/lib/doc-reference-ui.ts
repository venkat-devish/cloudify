import { metaForType } from "./aws-resources";
import type { DocReference } from "./types";
import type { AwsResourceType } from "./types";

const EXTRA_LABELS: Record<string, string> = {
  aws_sns_topic_subscription: "SNS subscription",
  aws_lambda_event_source_mapping: "Lambda trigger",
  aws_iam_role_policy: "IAM policy",
};

/** Human-readable chip label (SNS, SQS, Lambda, …). */
export function docRefShortLabel(resourceType: string): string {
  if (EXTRA_LABELS[resourceType]) return EXTRA_LABELS[resourceType];
  const meta = metaForType(resourceType as AwsResourceType);
  if (meta) return meta.shortLabel;
  return resourceType
    .replace(/^aws_/, "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function docRefLogoPath(url: string, category?: string): string {
  const host = category ?? new URL(url).hostname;
  if (host.includes("terraform") || host.includes("hashicorp")) return "/logos/hashicorp.svg";
  if (host.includes("github")) return "/logos/github.svg";
  if (host.includes("aws") || host.includes("amazon")) return "/logos/aws.svg";
  return "/globe.svg";
}

export function docRefAriaLabel(d: DocReference): string {
  return `${d.title}, ${d.resourceType}, provider ${d.providerVersion}`;
}
