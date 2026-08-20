import { api, z, postgres } from "@superblocksteam/sdk-api";

const APPS_DB = "c6e32cf4-ca66-42ae-aeb3-58c84ffae574";

export default api({
  name: "SeedRidgeScenarios",
  description: "Seeds all 50 Rules of the Ridge scenarios",

  integrations: {
    apps_db: postgres(APPS_DB),
  },

  input: z.object({}),

  output: z.object({
    success: z.boolean(),
    inserted: z.number(),
    message: z.string(),
  }),

  async run(ctx) {
    // All 50 scenarios — each row: [scenario_id, section, narrative, question, correct_answer, correct_rule, d1, d2, d3, belay_note]
    const scenarios: [string, string, string, string, string, string, string, string, string, string][] = [
      // ── ROE-01 to ROE-05: Primary Source Crediting ──
      [
        "ROE-01", "Primary Source Crediting",
        "Maya sources a prospect through cold outreach, books a qualified meeting for her AE Chris, and logs all her emails and calls in Salesforce. Chris attends the meeting, and together they progress the opportunity to S2. Maya is listed as the Sourcing Rep.",
        "Does Maya get credit?", "Yes", "Primary Source Crediting",
        "S2 Qualification (3 Whys)", "Secondary Source Crediting", "Required SFDC Fields",
        "This is textbook primary sourcing — Maya drove the engagement, booked the meeting, logged her touches, and is listed as Sourcing Rep. That's the ideal SDR motion."
      ],
      [
        "ROE-02", "Primary Source Crediting",
        "Jordan books a meeting with a prospect but doesn't log any of his outreach — no calls, no emails, nothing in Salesforce. The AE attends the meeting and creates an S2 opportunity. Jordan asks for credit.",
        "Does Jordan get credit?", "No", "Primary Source Crediting",
        "Required SFDC Fields", "S2 Qualification (3 Whys)", "Statute of Limitations",
        "SDRs must log calls, emails, in-person touches, or other relevant engagement in Salesforce for crediting to count. No logged activity = no proof of meaningful contribution."
      ],
      [
        "ROE-03", "Primary Source Crediting",
        "Priya nurtures a prospect over several weeks — sending personalized emails, coordinating an exec intro, and managing the relationship. Her AE creates the S2, but another SDR's name is accidentally listed as Sourcing Rep. Priya raises the issue with her manager.",
        "Does Priya get credit?", "Yes", "Primary Source Crediting",
        "Secondary Source Crediting", "Required SFDC Fields", "Statute of Limitations",
        "Priya demonstrated meaningful contribution through documented engagement. The Sourcing Rep field error is an admin fix — the SDR who actually drove the engagement earns the credit. She was right to escalate."
      ],
      [
        "ROE-04", "Primary Source Crediting",
        "Carlos's AE asks him to \"just add the prospect to a sequence\" for an account the AE is already working. Carlos adds them to a generic sequence but does no personalized outreach. The prospect replies to the AE directly, and the opp moves to S2.",
        "Does Carlos get credit?", "No", "Primary Source Crediting",
        "Secondary Source Crediting", "Multiple Opps in Same Account", "BoB Transitions",
        "Adding someone to a generic sequence isn't meaningful contribution. SDRs earn credit when they actively identify, engage, and nurture prospects — not just execute a mechanical task on the AE's behalf."
      ],
      [
        "ROE-05", "Primary Source Crediting",
        "Aisha delivers a physical gift basket to a prospect's office as part of a creative outreach play, follows up with a personalized email, and books a meeting. She logs the gift delivery, the email, and the call in Salesforce. The opp progresses to S2.",
        "Does Aisha get credit?", "Yes", "Primary Source Crediting",
        "Out-of-Territory Meetings", "Required SFDC Fields", "Statute of Limitations",
        "Physical gift deliveries count as relevant touches when logged in Salesforce. Aisha demonstrated creative, meaningful engagement — exactly what primary sourcing is about."
      ],

      // ── ROE-06 to ROE-09: S2 Qualification (3 Whys) ──
      [
        "ROE-06", "S2 Qualification (3 Whys)",
        "Tyler's opportunity is ready to move to S2. He's documented \"Why Buy Anything\" (the prospect's analytics tool is sunsetting) and \"Why Buy Now\" (contract renewal in 90 days). But the \"Why Buy Amplitude\" field is empty. His FLM reviews the opp and holds it at S1.",
        "Does Tyler get credit?", "No", "S2 Qualification (3 Whys)",
        "Primary Source Crediting", "Stage Movement (S1↔S2)", "Required SFDC Fields",
        "All three Whys must be completed AND validated by the FLM before an opp can progress to S2. Missing even one blocks the advancement — and no S2 means no credit."
      ],
      [
        "ROE-07", "S2 Qualification (3 Whys)",
        "Kenji fills out all three Whys for his opportunity: strong business pain, a board meeting driving urgency, and clear technical differentiation. But he submits it for S2 without getting his Front-Line Manager to review it first.",
        "Does Kenji get credit?", "No", "S2 Qualification (3 Whys)",
        "Primary Source Crediting", "Required SFDC Fields", "Stage Movement (S1↔S2)",
        "FLM validation is a required step — not optional. The manager must review and validate the 3 Whys before the opp progresses to S2. Without that sign-off, the opp shouldn't move."
      ],
      [
        "ROE-08", "S2 Qualification (3 Whys)",
        "Lena's FLM reviews her opportunity and validates all three Whys. The business pain is documented, there's a compelling event (new CRO starting in Q1), and the technical differentiation is clear. The opp moves to S2 on October 15th.",
        "Does Lena get credit?", "Yes", "S2 Qualification (3 Whys)",
        "Primary Source Crediting", "Opportunity Amount Changes", "Stage Movement (S1↔S2)",
        "All three Whys documented + FLM validated = green light. The S2 date of October 15th means credit is captured in the October snapshot and paid at end of November."
      ],
      [
        "ROE-09", "S2 Qualification (3 Whys)",
        "Rashid's prospect says \"we're frustrated with our current tool,\" so Rashid writes \"Prospect is unhappy\" in the Why Buy Anything field. His FLM pushes back, asking for the specific business pain — not just a vague complaint.",
        "Does Rashid get credit?", "No", "S2 Qualification (3 Whys)",
        "Primary Source Crediting", "Required SFDC Fields", "Statute of Limitations",
        "\"Why Buy Anything\" must identify the core business problem or pain point that justifies needing a solution. \"Prospect is unhappy\" doesn't cut it — you need specifics like data gaps, inability to measure ROI, or losing deals due to lack of insights."
      ],

      // ── ROE-10 to ROE-14: Out-of-Territory + Secondary Source ──
      [
        "ROE-10", "Out-of-Territory Meetings",
        "Dani is an AMER West SDR. At a regional conference in San Francisco, she meets a VP of Product from a company in her AE's territory. They have a great conversation, and Dani follows up with an email the next week. The prospect books a meeting.",
        "Does Dani get credit?", "Yes", "Out-of-Territory Meetings",
        "Primary Source Crediting", "Secondary Source Crediting", "Parent/Child Hierarchies",
        "Organic in-person interactions at events are permitted as long as the prospect and account fall within the SDR's region AND AE alignment. Dani's prospect is in her territory — she's good."
      ],
      [
        "ROE-11", "Out-of-Territory Meetings",
        "Sam is an AMER East SDR. At Dreamforce, he meets a prospect from an EMEA-based company. They exchange info, and Sam starts sequencing the prospect the following week, booking a meeting with an EMEA AE.",
        "Does Sam get credit?", "No", "Out-of-Territory Meetings",
        "Primary Source Crediting", "Secondary Source Crediting", "Statute of Limitations",
        "In-person interactions don't override regional boundaries. The prospect is EMEA — outside Sam's region entirely. He should have documented the interaction in Salesforce and handed off to the appropriate EMEA SDR/AE."
      ],
      [
        "ROE-12", "Out-of-Territory Meetings",
        "Nadia meets a prospect at a tradeshow who works at a company outside her AE alignment but within her region. She has a strong conversation and the prospect is interested. Nadia documents the interaction and hands off the prospect to the aligned SDR.",
        "Does Nadia get credit?", "No", "Out-of-Territory Meetings",
        "Primary Source Crediting", "Secondary Source Crediting", "Parent/Child Hierarchies",
        "Even though the prospect is in Nadia's region, they're outside her AE alignment. She did the right thing by documenting and handing off. She could submit for secondary sourcing credit if the aligned SDR/AE creates an opp from her interaction."
      ],
      [
        "ROE-13", "Out-of-Territory Meetings",
        "Malik is assigned to AMER West. He proactively cold-calls a prospect at a company headquartered in AMER East because he found them on LinkedIn and thought they'd be a great fit.",
        "Does Malik get credit?", "No", "Out-of-Territory Meetings",
        "Primary Source Crediting", "BoB Transitions", "Statute of Limitations",
        "Booking meetings outside your assigned territory is not encouraged and is only permitted within your assigned region. Cold outbound into another region is a clear violation — this isn't an organic event interaction. Management may take disciplinary action."
      ],
      [
        "ROE-14", "Out-of-Territory Meetings",
        "At a customer event, Ava coordinates a meeting between an out-of-region prospect and the prospect's aligned AE. The AE takes the meeting and creates a new opportunity. Ava submits for secondary sourcing credit.",
        "Does Ava get credit?", "Yes", "Secondary Source Crediting",
        "Out-of-Territory Meetings", "Primary Source Crediting", "Parent/Child Hierarchies",
        "When an SDR coordinates a meeting at an event that leads to an AE creating a new opportunity, the SDR can submit for secondary sourcing credit — even if the prospect is outside their territory. Ava played this perfectly."
      ],

      // ── ROE-15 to ROE-19: Secondary Source Crediting ──
      [
        "ROE-15", "Secondary Source Crediting",
        "Dev engages a prospect over email, answers their technical questions, and facilitates a follow-up by looping in the AE. The prospect doesn't convert immediately, but the AE later books the meeting and creates the opp. Dev submits for secondary credit with proof of his email thread.",
        "Does Dev get credit?", "Yes", "Secondary Source Crediting",
        "Primary Source Crediting", "Statute of Limitations", "BoB Transitions",
        "Dev engaged the prospect, added value, and facilitated the AE connection — even though he didn't book the meeting himself. With proof of engagement (the replied email thread), this is a valid secondary sourcing request."
      ],
      [
        "ROE-16", "Secondary Source Crediting",
        "Zara hears that an opp just flipped to S3. She sends the prospect a quick LinkedIn message saying \"Great to hear things are progressing!\" and submits for secondary credit, claiming she influenced the deal.",
        "Does Zara get credit?", "No", "Secondary Source Crediting",
        "Primary Source Crediting", "Statute of Limitations", "Stage Movement (S1↔S2)",
        "Secondary sourcing requires proof of engagement that occurred BEFORE the opportunity flips to S3, and it must showcase added value. A congratulatory LinkedIn message after S3 doesn't demonstrate incremental contribution to the deal."
      ],
      [
        "ROE-17", "Secondary Source Crediting",
        "Omar drives a prospect to attend an in-person roundtable event. At the event, the sales team engages with the prospect and books a meeting. The AE is listed as primary Sourcing Rep. Omar submits for secondary credit with proof he drove the prospect's attendance.",
        "Does Omar get credit?", "Yes", "Secondary Source Crediting",
        "Out-of-Territory Meetings", "Primary Source Crediting", "Parent/Child Hierarchies",
        "If an SDR drives a prospect to attend an event where the sales team engages and creates an opp, the SDR may request secondary credit for initiating the prospect's attendance. Omar has proof — this is a textbook secondary sourcing scenario."
      ],
      [
        "ROE-18", "Secondary Source Crediting",
        "Riley reaches out to a prospect and her personalized emails help reactivate an S2 opportunity that had been stalled for two months. The deal gets back on track. Riley submits for secondary credit with her email thread showing the prospect re-engaged.",
        "Does Riley get credit?", "Yes", "Secondary Source Crediting",
        "Primary Source Crediting", "Stage Movement (S1↔S2)", "Opportunity Amount Changes",
        "If an SDR's efforts directly contribute to reactivating and advancing a stalled S2 opportunity, they may request secondary credit. Riley's documented outreach drove the re-engagement — strong case."
      ],
      [
        "ROE-19", "Secondary Source Crediting",
        "An opportunity worth $250,000 is approved for secondary sourcing for Quinn. Quinn expects to see the full $250,000 reflected in her quota and commission.",
        "Does Quinn get the full $250,000 in credit?", "No", "Secondary Source Crediting",
        "Opportunity Amount Changes", "Primary Source Crediting", "Closed Lost / Clawbacks",
        "Secondary sourcing quota and commission credit is capped at $184,000. Even though the opp is worth $250K, Quinn's credit maxes out at $184K."
      ],

      // ── ROE-20 to ROE-25: BoB Transitions ──
      [
        "ROE-20", "BoB Transitions",
        "Ravi learns on March 1st that his Book of Business is changing. On March 10th, he adds a brand new prospect to an outbound sequence — someone he's never contacted before.",
        "Does Ravi get credit if this prospect converts?", "No", "BoB Transitions",
        "Primary Source Crediting", "Out-of-Territory Meetings", "Statute of Limitations",
        "On the day of the BoB transition announcement, no new outbound prospects may be added to sequences. Ravi added a new prospect 10 days after the announcement — that's a clear violation of the transition rules."
      ],
      [
        "ROE-21", "BoB Transitions",
        "Elena learns her BoB is transitioning on January 1st. A prospect she already had in a sequence replies on January 15th expressing interest. Elena books the meeting for February 1st. The opp moves to S2 in Q1.",
        "Does Elena get credit?", "Yes", "BoB Transitions",
        "Primary Source Crediting", "Statute of Limitations", "Out-of-Territory Meetings",
        "The prospect was already in sequence before the announcement, and the reply came within the 30-day transition window (Jan 1 – Jan 31). Elena gets credit because the engagement occurred within the window, and the S2 flip happened in the same quarter."
      ],
      [
        "ROE-22", "BoB Transitions",
        "Kai's BoB transitions on April 1st. A prospect he sourced during the 30-day window replies, and the S0 is created in April. But the opportunity doesn't flip to S2 until July — the following quarter.",
        "Does Kai get credit?", "No", "BoB Transitions",
        "Statute of Limitations", "Primary Source Crediting", "Stage Movement (S1↔S2)",
        "S0/S1s sourced by the original SDR during the transition must flip to S2 within the SAME QUARTER as the transition. April transition = Q2. July S2 flip = Q3. Different quarter — Kai loses the credit."
      ],
      [
        "ROE-23", "BoB Transitions",
        "Mika's BoB transitions on June 1st. An inbound MQL routes to Mika on June 20th. She works the lead and books a meeting. The opp flips to S2 on June 28th.",
        "Does Mika get credit?", "Yes", "BoB Transitions",
        "Live Chat Policy", "Primary Source Crediting", "Out-of-Territory Meetings",
        "Inbound leads continue to route normally and may be worked/credited to the current SDR through Day 30 of the transition. June 20th is within the 30-day window, and the S2 flip happened in the same quarter. Mika is covered."
      ],
      [
        "ROE-24", "BoB Transitions",
        "Blake's BoB transitions on February 1st. On March 5th (Day 32), a prospect that Blake had been working replies to one of his old emails. Blake follows up and books a meeting.",
        "Does Blake get credit?", "No", "BoB Transitions",
        "Statute of Limitations", "Primary Source Crediting", "Secondary Source Crediting",
        "After Day 30, the prior SDR must cease all outreach, and all activity/ownership moves to SDR #2. The reply came on Day 32 — outside the transition window. Blake should not have followed up; SDR #2 now owns this prospect."
      ],
      [
        "ROE-25", "BoB Transitions",
        "Tess's BoB transitions on May 1st. She has an active prospect already in a sequence that's set to run through May 20th. The sequence continues to send automated emails through that period.",
        "Is Tess's sequence allowed to continue?", "Yes", "BoB Transitions",
        "Out-of-Territory Meetings", "Primary Source Crediting", "Statute of Limitations",
        "All prospects already in sequence remain with the current SDR through Day 30, regardless of when the sequence ends. Tess's sequence finishes on Day 20 — well within the window. She's good."
      ],

      // ── ROE-26 to ROE-29: Live Chat Policy ──
      [
        "ROE-26", "Live Chat Policy",
        "A visitor starts a live chat on the Amplitude website. The chat routes to Jordan, who handles the conversation professionally and books a meeting. But the Account is assigned to Maya's territory, and Maya is the SDR aligned to that account.",
        "Does Jordan get credit?", "No", "Live Chat Policy",
        "Primary Source Crediting", "Secondary Source Crediting", "Out-of-Territory Meetings",
        "Live chat credit goes to whoever is assigned to the Account at the time the S2 is created — regardless of who handled the chat. Jordan did great work, but Maya owns the account. Credit goes to Maya."
      ],
      [
        "ROE-27", "Live Chat Policy",
        "Priya has been working an account for weeks — emails, calls, LinkedIn messages. A contact from that same account starts a live chat that routes to Carlos. Carlos handles the chat, and the AE creates an S2. Priya argues she should get credit because of her prior engagement.",
        "Does Priya get credit?", "Yes", "Live Chat Policy",
        "Primary Source Crediting", "Secondary Source Crediting", "Statute of Limitations",
        "Live chat credit is based exclusively on Account assignment — not who handled the chat, prior activity, or contact ownership. If Priya is assigned to the Account, she gets the credit, regardless of Carlos handling the chat."
      ],
      [
        "ROE-28", "Live Chat Policy",
        "A Dynamic Chat routes a visitor to Aisha, who is aligned to AMER West. But the visitor's company is based in EMEA, and the Account is owned by an EMEA SDR. Aisha books a meeting and wants credit.",
        "Does Aisha get credit?", "No", "Live Chat Policy",
        "Out-of-Territory Meetings", "Primary Source Crediting", "BoB Transitions",
        "Dynamic Chat may route visitors outside an SDR's territory, but credit follows Account ownership at S2 creation — not who handled the chat. The EMEA SDR assigned to the Account gets credit. Aisha should still document the chat and book the meeting."
      ],
      [
        "ROE-29", "Live Chat Policy",
        "Tyler handles a live chat and books a meeting. He's also the SDR assigned to the Account. The AE creates the opp and it moves to S2.",
        "Does Tyler get credit?", "Yes", "Live Chat Policy",
        "Primary Source Crediting", "S2 Qualification (3 Whys)", "Required SFDC Fields",
        "Tyler handled the chat AND is assigned to the Account. Credit is based on Account assignment at S2 creation, and Tyler checks that box. Clean credit."
      ],

      // ── ROE-30 to ROE-32: Opportunity Amount Changes ──
      [
        "ROE-30", "Opportunity Amount Changes",
        "Kenji gets credit for an S2 worth $150,000 on November 14th. The credit date is November 30th. On December 20th — 20 days after credit — the opp amount drops to $80,000 (a 47% decrease).",
        "Does Kenji keep his original $150K credit?", "No", "Opportunity Amount Changes",
        "Closed Lost / Clawbacks", "Primary Source Crediting", "Statute of Limitations",
        "If the S2 amount changes by more than 40% (up or down) within 30 days of the credit date, the SDR's credited amount is adjusted. A 47% drop within 20 days of credit = Kenji's credit gets adjusted down to $80K."
      ],
      [
        "ROE-31", "Opportunity Amount Changes",
        "Lena's opp converts to S2 at $100,000 on March 5th. The credit date is March 31st. On April 25th, the deal expands to $180,000 — an 80% increase.",
        "Does Lena's credit get adjusted up to $180K?", "Yes", "Opportunity Amount Changes",
        "Multiple Opps in Same Account", "Primary Source Crediting", "Secondary Source Crediting",
        "The 40% threshold works in both directions — up AND down. The change happened within 30 days of the credit date (March 31 + 30 = April 30), and 80% exceeds the 40% threshold. Lena's credit adjusts up."
      ],
      [
        "ROE-32", "Opportunity Amount Changes",
        "Rashid's opp converts to S2 at $200,000 on July 10th. The credit date is July 31st. On September 5th — 36 days after credit — the amount drops to $90,000.",
        "Does Rashid's credit get adjusted?", "No", "Opportunity Amount Changes",
        "Closed Lost / Clawbacks", "Statute of Limitations", "Stage Movement (S1↔S2)",
        "The 30-day true-up window starts from the credit date (July 31). September 5th is Day 36 — outside the window. Rashid keeps his original $200K credit even though the deal shrank significantly."
      ],

      // ── ROE-33 to ROE-35: Multiple Opps in Same Account ──
      [
        "ROE-33", "Multiple Opps in Same Account",
        "Dani has an existing S2 at Acme Corp for the Analytics product. She discovers that a completely different business unit at Acme needs the CDP product. She creates a new S0 for the CDP use case and works it to S2.",
        "Does Dani get credit for the second opp?", "Yes", "Multiple Opps in Same Account",
        "Primary Source Crediting", "Parent/Child Hierarchies", "Secondary Source Crediting",
        "Multiple opportunities in the same account are allowed when each represents a distinct product, use case, or business line progressing independently. Analytics vs. CDP = two distinct products. Both credits stand."
      ],
      [
        "ROE-34", "Multiple Opps in Same Account",
        "Sam has an S2 at TechCo for $120,000. He creates a second opportunity at TechCo for the same product, same use case, and same business unit — just framed slightly differently in the description. He wants credit for both.",
        "Does Sam get credit for the second opp?", "No", "Multiple Opps in Same Account",
        "Primary Source Crediting", "Opportunity Amount Changes", "Closed Lost / Clawbacks",
        "Duplicate opportunities — those without distinct differences in product, stage, or business need — are not eligible for additional credit. Same product + same use case + same business unit = duplicate. Nice try though."
      ],
      [
        "ROE-35", "Multiple Opps in Same Account",
        "Nadia has an S2 at GlobalBank for the enterprise analytics platform. A separate division of GlobalBank reaches out through an inbound demo request for the same product but for a completely different use case — fraud detection vs. marketing attribution.",
        "Does Nadia get credit for both opps?", "Yes", "Multiple Opps in Same Account",
        "Parent/Child Hierarchies", "Primary Source Crediting", "Secondary Source Crediting",
        "Even though it's the same product, the use cases are completely different (fraud detection vs. marketing attribution) and they're progressing independently. Distinct use case = distinct opportunity."
      ],

      // ── ROE-36 to ROE-39: Stage Movement (S1↔S2) ──
      [
        "ROE-36", "Stage Movement (S1↔S2)",
        "Malik's opp moves from S1 to S2 on October 3rd. On October 18th, the AE decides it isn't qualified and moves it back to S1. On October 29th, after additional discovery, it moves back to S2 and stays there through the end-of-month snapshot.",
        "Does Malik get credit?", "Yes", "Stage Movement (S1↔S2)",
        "S2 Qualification (3 Whys)", "Closed Lost / Clawbacks", "Primary Source Crediting",
        "An opp that bounces between S1 and S2 within the same month only earns credit if it's confirmed in S2 by the end-of-month snapshot. Malik's opp returned to S2 on October 29th and stayed — he's credited."
      ],
      [
        "ROE-37", "Stage Movement (S1↔S2)",
        "Ava's opp moves to S2 on November 5th. On November 22nd, the AE moves it back to S1 because the champion went dark. It's still sitting at S1 when the November 30th snapshot is taken.",
        "Does Ava get credit?", "No", "Stage Movement (S1↔S2)",
        "Closed Lost / Clawbacks", "S2 Qualification (3 Whys)", "Statute of Limitations",
        "If an opp moves from S1 to S2 but returns to S1 within the same month, it's NOT credited unless it's back in S2 by the end-of-month snapshot. Ava's opp was still at S1 on November 30th — no credit."
      ],
      [
        "ROE-38", "Stage Movement (S1↔S2)",
        "Dev's opp moves to S2 on January 28th. On February 2nd, the AE realizes a key stakeholder wasn't involved and moves it back to S1. It returns to S2 on February 15th and stays there through the February 28th snapshot.",
        "Does Dev get credit?", "Yes", "Stage Movement (S1↔S2)",
        "S2 Qualification (3 Whys)", "Opportunity Amount Changes", "Closed Lost / Clawbacks",
        "The S2→S1→S2 bounce happened across months (January to February). The rule about not crediting back-and-forth applies within the SAME month. Dev's opp was in S2 for the February snapshot — he gets February credit."
      ],
      [
        "ROE-39", "Stage Movement (S1↔S2)",
        "Zara's opp moves to S2 on March 1st, goes back to S1 on March 10th, returns to S2 on March 15th, goes back to S1 on March 20th, and is still at S1 on March 31st.",
        "Does Zara get credit?", "No", "Stage Movement (S1↔S2)",
        "Closed Lost / Clawbacks", "Primary Source Crediting", "S2 Qualification (3 Whys)",
        "Doesn't matter how many times it bounced — the only thing that matters is where the opp sits at the end-of-month snapshot. S1 on March 31st = no credit."
      ],

      // ── ROE-40 to ROE-44: Closed Lost / Clawbacks ──
      [
        "ROE-40", "Closed Lost / Clawbacks",
        "Omar's opp moved to S2 in September and he received credit. In November — 65 days after the S2 date — the opp is marked Closed Lost with reason \"No Addressable Pain | S1.\"",
        "Does Omar keep his credit?", "No", "Closed Lost / Clawbacks",
        "Statute of Limitations", "Opportunity Amount Changes", "Stage Movement (S1↔S2)",
        "Credit is reversed within 90 days from the original S2 date if the opp goes Closed Lost for specific reasons — including \"No Addressable Pain | S1.\" At 65 days, this is within the 90-day clawback window. Omar's credit is pulled."
      ],
      [
        "ROE-41", "Closed Lost / Clawbacks",
        "Riley's opp goes Closed Lost with reason \"Opportunity Merge.\" Operations investigates and determines it IS a true duplicate of another existing opportunity in the pipeline.",
        "Does Riley keep her credit?", "No", "Closed Lost / Clawbacks",
        "Multiple Opps in Same Account", "Primary Source Crediting", "Opportunity Amount Changes",
        "\"Opportunity Merge\" flags a potential duplicate. Ops reviews these cases — if it's confirmed as a duplicate, any previously issued credit is removed or clawed back. Amplitude doesn't pay twice for the same opp."
      ],
      [
        "ROE-42", "Closed Lost / Clawbacks",
        "Elena's opp moved to S2 on January 15th. On May 1st — 106 days later — the opp goes Closed Lost with reason \"Wrong Person | S1.\"",
        "Does Elena keep her credit?", "Yes", "Closed Lost / Clawbacks",
        "Statute of Limitations", "Stage Movement (S1↔S2)", "Opportunity Amount Changes",
        "The clawback clause only applies within 90 days from the original S2 date. At 106 days, Elena is past the 90-day window. Even though the Closed Lost reason would normally trigger a clawback, the statute of limitations protects her credit."
      ],
      [
        "ROE-43", "Closed Lost / Clawbacks",
        "Kai's opp is at S2 but the prospect never showed up to the initial meeting. The AE marks it Closed Lost with reason \"No Show | S0.\" This happens 45 days after the S2 date.",
        "Does Kai keep his credit?", "No", "Closed Lost / Clawbacks",
        "S2 Qualification (3 Whys)", "Primary Source Crediting", "Stage Movement (S1↔S2)",
        "\"No Show | S0\" is one of the specific Closed Lost reasons that triggers credit removal. At 45 days, it's well within the 90-day clawback window. The meeting never happened — the opp shouldn't have been at S2 in the first place."
      ],
      [
        "ROE-44", "Closed Lost / Clawbacks",
        "Mika's opp goes Closed Lost with reason \"Went with competitor.\" The AE marks it 60 days after the S2 date. Mika is worried about a clawback.",
        "Does Mika lose her credit?", "No", "Closed Lost / Clawbacks",
        "Statute of Limitations", "Opportunity Amount Changes", "Stage Movement (S1↔S2)",
        "\"Went with competitor\" is NOT one of the listed clawback-eligible Closed Lost reasons. The clawback only applies to: Opportunity Merge, No Show | S0, Wrong Person | S1, Wrong Company | S1, and No Addressable Pain | S1. Mika keeps her credit."
      ],

      // ── ROE-45 to ROE-48: Parent/Child Hierarchies ──
      [
        "ROE-45", "Parent/Child Hierarchies",
        "Carlos is aligned to the GlobalTech parent account and its child entity, GlobalTech Analytics. He cold-calls a prospect at GlobalTech Cloud — a different child entity owned by a different AE — and books a meeting.",
        "Does Carlos get credit?", "No", "Parent/Child Hierarchies",
        "Out-of-Territory Meetings", "Primary Source Crediting", "Multiple Opps in Same Account",
        "SDRs may only outbound into accounts aligned to their assigned AE and territory. GlobalTech Cloud is owned by a different AE — Carlos can't cold-call into it even though it's under the same parent company."
      ],
      [
        "ROE-46", "Parent/Child Hierarchies",
        "At a conference, Jordan meets a VP from MegaCorp Payments — a child entity NOT aligned to Jordan's AE. They have an organic conversation, and Jordan books a meeting. The AE for MegaCorp Payments creates an opp.",
        "Does Jordan get credit?", "Yes", "Parent/Child Hierarchies",
        "Out-of-Territory Meetings", "Secondary Source Crediting", "Primary Source Crediting",
        "Organic in-person interactions at events are an exception to the alignment rule for parent/child hierarchies. Jordan met the prospect organically — not through proactive outbound — so the credit stands."
      ],
      [
        "ROE-47", "Parent/Child Hierarchies",
        "Priya sources a meeting from GlobalBank HQ (her aligned parent account). But the opportunity needs to sit under GlobalBank EMEA in Salesforce because that's where the buying entity is. The opp is created under GlobalBank EMEA, which is owned by a different AE.",
        "Does Priya get credit?", "Yes", "Parent/Child Hierarchies",
        "Out-of-Territory Meetings", "Primary Source Crediting", "Secondary Source Crediting",
        "Crediting follows the origin of the engagement, not the opportunity placement. Priya sourced the meeting from within her alignment (the parent account). Even though the opp sits under a different child entity in SFDC, she gets credit."
      ],
      [
        "ROE-48", "Parent/Child Hierarchies",
        "An inbound demo request comes in from a contact at DataCorp Labs — a child entity with no assigned SDR. The lead routes to Aisha based on routing rules. She works the lead and it converts to S2.",
        "Does Aisha get credit?", "Yes", "Parent/Child Hierarchies",
        "Live Chat Policy", "Primary Source Crediting", "BoB Transitions",
        "Inbound leads follow routing rules, not hierarchy rules. The lead routed to Aisha, she worked it, and it converted. Doesn't matter that the child entity has no SDR — inbound routing determines who gets it."
      ],

      // ── ROE-49 to ROE-50: Statute of Limitations ──
      [
        "ROE-49", "Statute of Limitations",
        "Tyler worked a prospect 4 months ago — emails, calls, a meeting that didn't convert. Now, 120 days later, the AE creates a new opportunity from the same account. Tyler claims credit because of his original outreach.",
        "Does Tyler get credit?", "No", "Statute of Limitations",
        "Primary Source Crediting", "Secondary Source Crediting", "BoB Transitions",
        "SDR activity must occur within 90 days of opportunity creation to be eligible for credit. Tyler's engagement was 120 days ago — well outside the 90-day statute of limitations. Even great outreach expires."
      ],
      [
        "ROE-50", "Statute of Limitations",
        "Dani sent a cold email to a prospect 85 days ago. The prospect finally replies, books a meeting, and the AE creates an opportunity. It's been 85 days since Dani's initial outreach.",
        "Does Dani get credit?", "Yes", "Statute of Limitations",
        "Primary Source Crediting", "BoB Transitions", "Secondary Source Crediting",
        "85 days is within the 90-day statute of limitations. Dani's original outreach is still eligible for credit. Five more days and she would have been out of luck — timing matters."
      ],
    ];

    // Batch insert using a single multi-row INSERT
    const placeholders: string[] = [];
    const values: string[] = [];
    let paramIdx = 1;

    for (const s of scenarios) {
      placeholders.push(
        `($${paramIdx}, $${paramIdx + 1}, $${paramIdx + 2}, $${paramIdx + 3}, $${paramIdx + 4}, $${paramIdx + 5}, $${paramIdx + 6}, $${paramIdx + 7}, $${paramIdx + 8}, $${paramIdx + 9})`
      );
      values.push(...s);
      paramIdx += 10;
    }

    const result = await ctx.integrations.apps_db.execute(
      `INSERT INTO cliptracker_v2_ridge_scenarios
        (scenario_id, section, narrative, question, correct_answer, correct_rule, distractor_1, distractor_2, distractor_3, belay_note)
      VALUES ${placeholders.join(",\n")}
      ON CONFLICT (scenario_id) DO NOTHING`,
      values,
      { label: "Seed all 50 Ridge scenarios" }
    );

    const inserted = result.rowCount ?? 0;
    ctx.log.info(`Seeded ${inserted} Ridge scenarios`);
    return {
      success: true,
      inserted,
      message: `Seeded ${inserted} of 50 scenarios (${50 - inserted} already existed)`,
    };
  },
});
