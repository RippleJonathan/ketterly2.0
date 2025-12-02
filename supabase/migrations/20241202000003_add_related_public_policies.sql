-- Add public read policies for related tables when viewing quotes via share token
-- These are needed because the quote query joins to line_items, leads, and companies

-- Allow public read of quote line items for quotes with valid share token
CREATE POLICY "Anyone can view line items for quotes with valid share token"
  ON public.quote_line_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.quotes
      WHERE quotes.id = quote_line_items.quote_id
        AND quotes.share_token IS NOT NULL
        AND quotes.deleted_at IS NULL
        AND (
          quotes.share_link_expires_at IS NULL
          OR quotes.share_link_expires_at > NOW()
        )
    )
  );

-- Allow public read of lead info for quotes with valid share token
CREATE POLICY "Anyone can view leads for quotes with valid share token"
  ON public.leads
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.quotes
      WHERE quotes.lead_id = leads.id
        AND quotes.share_token IS NOT NULL
        AND quotes.deleted_at IS NULL
        AND (
          quotes.share_link_expires_at IS NULL
          OR quotes.share_link_expires_at > NOW()
        )
    )
  );

-- Allow public read of company info for quotes with valid share token
CREATE POLICY "Anyone can view companies for quotes with valid share token"
  ON public.companies
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.quotes
      WHERE quotes.company_id = companies.id
        AND quotes.share_token IS NOT NULL
        AND quotes.deleted_at IS NULL
        AND (
          quotes.share_link_expires_at IS NULL
          OR quotes.share_link_expires_at > NOW()
        )
    )
  );
