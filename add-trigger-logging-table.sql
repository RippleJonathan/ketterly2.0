-- Create a logging table to track trigger execution
CREATE TABLE IF NOT EXISTS public.trigger_execution_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger_name TEXT NOT NULL,
  operation TEXT NOT NULL,
  table_name TEXT NOT NULL,
  record_id UUID,
  message TEXT,
  data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS (but allow all operations for now)
ALTER TABLE public.trigger_execution_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all operations on trigger logs" ON public.trigger_execution_logs;
CREATE POLICY "Allow all operations on trigger logs"
  ON public.trigger_execution_logs
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Index for querying recent logs
CREATE INDEX IF NOT EXISTS idx_trigger_logs_created_at 
  ON public.trigger_execution_logs(created_at DESC);

-- Now update the trigger function to log to this table
CREATE OR REPLACE FUNCTION auto_create_commissions_on_invoice()
RETURNS TRIGGER AS $$
DECLARE
  v_lead RECORD;
  v_company_id UUID;
  v_user_ids UUID[];
  v_user_id UUID;
  v_step TEXT;
BEGIN
  -- Log that trigger fired
  INSERT INTO trigger_execution_logs (trigger_name, operation, table_name, record_id, message, data)
  VALUES (
    'auto_create_commissions_on_invoice',
    TG_OP,
    TG_TABLE_NAME,
    NEW.id,
    'Trigger fired',
    jsonb_build_object(
      'invoice_id', NEW.id,
      'lead_id', NEW.lead_id,
      'total', NEW.total,
      'status', NEW.status
    )
  );

  v_step := 'checking operation type';
  
  -- Only process when total > 0 (skip the initial INSERT with total=0)
  IF NEW.total > 0 AND (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.total != NEW.total)) THEN
    v_step := 'fetching lead';
    
    -- Get lead and company info
    SELECT l.*, l.company_id INTO v_lead
    FROM leads l
    WHERE l.id = NEW.lead_id;
    
    IF v_lead IS NULL THEN
      INSERT INTO trigger_execution_logs (trigger_name, operation, table_name, record_id, message)
      VALUES ('auto_create_commissions_on_invoice', TG_OP, TG_TABLE_NAME, NEW.id, 
              'ERROR: Lead not found for lead_id: ' || NEW.lead_id);
      RETURN NEW;
    END IF;
    
    v_step := 'collecting users';
    v_company_id := v_lead.company_id;
    
    -- Collect all assigned user IDs
    v_user_ids := ARRAY[]::UUID[];
    
    IF v_lead.sales_rep_id IS NOT NULL THEN
      v_user_ids := array_append(v_user_ids, v_lead.sales_rep_id);
    END IF;
    
    IF v_lead.marketing_rep_id IS NOT NULL THEN
      v_user_ids := array_append(v_user_ids, v_lead.marketing_rep_id);
    END IF;
    
    IF v_lead.sales_manager_id IS NOT NULL THEN
      v_user_ids := array_append(v_user_ids, v_lead.sales_manager_id);
    END IF;
    
    IF v_lead.production_manager_id IS NOT NULL THEN
      v_user_ids := array_append(v_user_ids, v_lead.production_manager_id);
    END IF;
    
    INSERT INTO trigger_execution_logs (trigger_name, operation, table_name, record_id, message, data)
    VALUES (
      'auto_create_commissions_on_invoice',
      TG_OP,
      TG_TABLE_NAME,
      NEW.id,
      'Users collected: ' || array_length(v_user_ids, 1),
      jsonb_build_object('user_ids', v_user_ids)
    );
    
    v_step := 'processing users';
    
    -- Create commissions for each assigned user
    FOREACH v_user_id IN ARRAY v_user_ids
    LOOP
      v_step := 'checking existing commission for user ' || v_user_id;
      
      -- Check if commission already exists for this user/lead
      IF NOT EXISTS (
        SELECT 1 FROM lead_commissions 
        WHERE lead_id = NEW.lead_id 
        AND user_id = v_user_id 
        AND deleted_at IS NULL
      ) THEN
        v_step := 'creating commission for user ' || v_user_id;
        
        -- Get user's commission plan
        DECLARE
          v_plan RECORD;
          v_user RECORD;
          v_base_amount DECIMAL(10,2);
          v_calculated_amount DECIMAL(10,2);
        BEGIN
          v_step := 'fetching user ' || v_user_id;
          
          -- First get the user to find their commission_plan_id
          SELECT * INTO v_user
          FROM users
          WHERE id = v_user_id
          AND company_id = v_company_id
          AND deleted_at IS NULL;
          
          IF v_user IS NULL THEN
            INSERT INTO trigger_execution_logs (trigger_name, operation, table_name, record_id, message)
            VALUES ('auto_create_commissions_on_invoice', TG_OP, TG_TABLE_NAME, NEW.id,
                    'ERROR: User not found: ' || v_user_id);
            CONTINUE;
          END IF;
          
          -- Skip if user has no commission plan
          IF v_user.commission_plan_id IS NULL THEN
            INSERT INTO trigger_execution_logs (trigger_name, operation, table_name, record_id, message)
            VALUES ('auto_create_commissions_on_invoice', TG_OP, TG_TABLE_NAME, NEW.id,
                    'SKIP: User has no commission plan: ' || v_user_id);
            CONTINUE;
          END IF;
          
          v_step := 'fetching commission plan ' || v_user.commission_plan_id;
          
          -- Get the commission plan
          SELECT * INTO v_plan
          FROM commission_plans
          WHERE id = v_user.commission_plan_id
          AND company_id = v_company_id
          AND deleted_at IS NULL;
          
          IF v_plan IS NULL THEN
            INSERT INTO trigger_execution_logs (trigger_name, operation, table_name, record_id, message)
            VALUES ('auto_create_commissions_on_invoice', TG_OP, TG_TABLE_NAME, NEW.id,
                    'ERROR: Commission plan not found: ' || v_user.commission_plan_id);
            CONTINUE;
          END IF;
          
          v_step := 'calculating commission for user ' || v_user_id;
          
          -- Calculate base amount (invoice total)
          v_base_amount := NEW.total;
          
          -- Calculate commission amount
          IF v_plan.commission_type = 'percentage' THEN
            v_calculated_amount := v_base_amount * (v_plan.commission_rate / 100.0);
          ELSIF v_plan.commission_type = 'flat_amount' THEN
            v_calculated_amount := v_plan.flat_amount;
          ELSE
            v_calculated_amount := 0;
          END IF;
          
          v_step := 'inserting commission for user ' || v_user_id;
          
          -- Insert commission
          INSERT INTO lead_commissions (
            lead_id,
            user_id,
            company_id,
            commission_plan_id,
            base_amount,
            commission_type,
            commission_rate,
            flat_amount,
            calculated_amount,
            balance_owed,
            paid_amount,
            paid_when,
            status,
            created_by
          ) VALUES (
            NEW.lead_id,
            v_user_id,
            v_company_id,
            v_plan.id,
            v_base_amount,
            v_plan.commission_type,
            v_plan.commission_rate,
            v_plan.flat_amount,
            v_calculated_amount,
            v_calculated_amount,
            0,
            v_plan.paid_when,
            'pending',
            NEW.created_by
          );
          
          INSERT INTO trigger_execution_logs (trigger_name, operation, table_name, record_id, message, data)
          VALUES (
            'auto_create_commissions_on_invoice',
            TG_OP,
            TG_TABLE_NAME,
            NEW.id,
            'SUCCESS: Commission created for user',
            jsonb_build_object(
              'user_id', v_user_id,
              'plan_name', v_plan.name,
              'base_amount', v_base_amount,
              'calculated_amount', v_calculated_amount
            )
          );
          
        EXCEPTION WHEN OTHERS THEN
          INSERT INTO trigger_execution_logs (trigger_name, operation, table_name, record_id, message, data)
          VALUES (
            'auto_create_commissions_on_invoice',
            TG_OP,
            TG_TABLE_NAME,
            NEW.id,
            'EXCEPTION at step: ' || v_step || ' - ' || SQLERRM,
            jsonb_build_object('user_id', v_user_id, 'sqlstate', SQLSTATE)
          );
        END;
      ELSE
        INSERT INTO trigger_execution_logs (trigger_name, operation, table_name, record_id, message)
        VALUES ('auto_create_commissions_on_invoice', TG_OP, TG_TABLE_NAME, NEW.id,
                'SKIP: Commission already exists for user: ' || v_user_id);
      END IF;
    END LOOP;
  ELSE
    INSERT INTO trigger_execution_logs (trigger_name, operation, table_name, record_id, message)
    VALUES ('auto_create_commissions_on_invoice', TG_OP, TG_TABLE_NAME, NEW.id,
            'SKIP: Not INSERT and total unchanged');
  END IF;
  
  RETURN NEW;
  
EXCEPTION WHEN OTHERS THEN
  INSERT INTO trigger_execution_logs (trigger_name, operation, table_name, record_id, message, data)
  VALUES (
    'auto_create_commissions_on_invoice',
    TG_OP,
    TG_TABLE_NAME,
    NEW.id,
    'FATAL EXCEPTION at step: ' || v_step || ' - ' || SQLERRM,
    jsonb_build_object('sqlstate', SQLSTATE)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
