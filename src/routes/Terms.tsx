import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { DESK_PHONE, DESK_EMAIL } from "@/lib/contact";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <h2 className="text-base font-semibold text-ink">{title}</h2>
      <div className="flex flex-col gap-2 text-sm leading-6 text-muted">{children}</div>
    </div>
  );
}

export function Terms() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center gap-3 px-screen pt-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Back"
          className="flex h-11 w-11 items-center justify-center rounded-full text-ink hover:bg-primary-soft"
        >
          <ChevronLeft size={22} />
        </button>
        <h1 className="font-display text-xl font-bold text-ink">Terms &amp; Conditions</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-screen py-5">
        <p className="text-xs text-muted">Last updated September 2026</p>

        <div className="mt-4 rounded-card border border-warning bg-warning/15 p-4">
          <p className="text-sm font-semibold text-ink">This is a student project.</p>
          <p className="mt-1 text-sm leading-6 text-ink">
            DhobISB is built and run by a student, for the convenience of fellow residents in the
            ISB student villages. It is not an official ISB service, not affiliated with or
            endorsed by ISB, and not a company. It comes with no formal guarantees — it&apos;s
            offered purely as a convenience, nothing else.
          </p>
        </div>

        <div className="mt-5 flex flex-col gap-6">
          <Section title="Who this is for">
            <p>
              DhobISB is a laundry pickup and delivery coordination app built for students living
              in the ISB (Indian School of Business) student villages. It is not a public
              commercial service — it exists to coordinate pickups between residents and the
              laundry desk serving their village.
            </p>
            <p>
              Sign-in uses Google, and we don&apos;t restrict it to an @isb.edu address. That said,
              this app is intended solely for current ISB residents. Creating or using an account
              if you&apos;re not an ISB resident isn&apos;t permitted, and we may suspend or remove
              accounts that don&apos;t belong to the community this app serves.
            </p>
          </Section>

          <Section title="No warranty">
            <p>
              This is a student-run convenience tool, not a commercial or professionally audited
              service. It&apos;s provided &ldquo;as is,&rdquo; with no guarantee that it will be
              available, error-free, or uninterrupted. Use it at your convenience, not as a
              service you formally depend on.
            </p>
          </Section>

          <Section title="What we collect">
            <p>
              <span className="font-medium text-ink">From Google, when you sign in:</span> your
              name, email address, and profile photo. We only request your basic profile and
              email — nothing else from your Google account.
            </p>
            <p>
              <span className="font-medium text-ink">What you tell us directly:</span> student ID,
              phone number, WhatsApp preference, village, block, floor, room number, pickup point,
              and any notes you leave for your laundry partner.
            </p>
            <p>
              <span className="font-medium text-ink">Created as you use the app:</span> pickup and
              delivery orders, service selections, declared and verified item counts, special
              instructions, ratings and reviews, issue reports and any photos you attach to them,
              plan and quota usage, and notification history.
            </p>
          </Section>

          <Section title="How it's used, and who sees it">
            <p>
              We use this information to run the service: scheduling and tracking your pickups,
              sending you status notifications, and letting you manage your plan.
            </p>
            <p>
              The laundry partner assigned to a pickup can see your name, room, phone number, and
              any notes you&apos;ve left for that order — that&apos;s what they need to actually
              collect your bag. They don&apos;t see the rest of your profile or your order
              history with other partners.
            </p>
            <p>
              We don&apos;t sell your data or share it with advertisers. Our backend and database
              are hosted by Supabase, a third-party cloud platform that processes data on our
              behalf under its own security practices.
            </p>
          </Section>

          <Section title="Payments">
            <p>
              DhobISB does not currently process real payments in the app. Plan pricing and
              per-order amounts shown are for reference, and any actual billing is handled
              separately through arrangements communicated by the laundry desk.
            </p>
          </Section>

          <Section title="Your choices">
            <p>
              From your Profile, you can update your address and contact details, turn
              notification types on or off, download a copy of your data, or delete your account
              entirely. Deleting your account removes your profile and order history from our
              systems. Some minimal records may be kept where needed for security or dispute
              resolution.
            </p>
          </Section>

          <Section title="Using the app fairly">
            <p>
              Keep your account details accurate, don&apos;t use someone else&apos;s account or
              impersonate another resident, and treat laundry partners with the same courtesy
              you&apos;d expect in person. We may suspend access for accounts that misuse the
              service or repeatedly submit false reports.
            </p>
          </Section>

          <Section title="Changes to these terms">
            <p>
              We may update this page as the app changes. Meaningful changes will be reflected
              here with a new "last updated" date.
            </p>
          </Section>

          <Section title="Questions">
            <p>
              Reach the laundry desk at{" "}
              <a href={`tel:${DESK_PHONE.replace(/\s/g, "")}`} className="text-primary underline">
                {DESK_PHONE}
              </a>{" "}
              or{" "}
              <a href={`mailto:${DESK_EMAIL}`} className="text-primary underline">
                {DESK_EMAIL}
              </a>
              .
            </p>
          </Section>
        </div>
      </div>
    </div>
  );
}
