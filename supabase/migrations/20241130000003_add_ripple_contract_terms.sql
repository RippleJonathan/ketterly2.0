-- This migration adds contract terms for Ripple Roofing & Construction
-- Run this in your Supabase SQL Editor

-- First, ensure the contract_terms column exists (from previous migration)
ALTER TABLE public.companies
ADD COLUMN IF NOT EXISTS contract_terms TEXT;

-- Update Ripple Roofing & Construction with their contract terms
-- Replace 'Ripple Roofing & Construction' with your actual company name if different
UPDATE public.companies
SET contract_terms = 'With this contract, Ripple Roofing and Construction sets forth the agreement between Ripple Roofing and Construction (hereinafter "Ripple") and the Customer (hereinafter "Customer") to establish the working terms for work to be completed at the service address. In addition to the working terms, this contract also establishes the agreed upon payment schedule between Ripple and Customer.

Please Review and Initial the Below Items:

_____________Shingle Type/Color/Delivery Instructions: ________________________

_____________Existing Property Damage (Fascia Rot, Driveway Cracks, etc.): ________________________

Liability Disclosure Addendum

Initial Below:

____________I understand that this is a construction site, and agree to use caution when entering and exiting my property and to ensure the safety of my family members, friends, children and pets on the premises. I understand and accept the risks of falling debris and errant nails. It is my responsibility to use reasonable caution and I agree to release and hold harmless Ripple Roofing and Construction, of any responsibility for any injury, damage to property or death that may occur due in part or in whole to any negligence on my part. I understand it is my responsibility to secure any items in my home that may be fragile or might fall resulting in injury or death. Any damage to any items is the sole responsibility of Customer.

____________All vehicles operated by employees are rated for driveway usage and any damage and/or cracks resulting from routine driveway usage and/or parking in the driveway to complete the job is not the responsibility of Ripple Roofing and Construction.

____________I understand that any punctured lines are not the responsibility of Ripple Roofing and Construction during the installation process. Code provides for installation standards for roofing and all code standards are followed by Ripple. In the event that an electric, HVAC, Plumbing, etc. line is damaged during the installation process, it is the sole responsibility of Customer to repair.

Right of Rescission and Property Disclosure

____________You have the right to cancel this contract within 3 business days of the contract date under TX State Law. By initialing here I confirm that I have been informed of the cancellation information found on this contract titled "Notice of Cancellation for Contract".

Cancellation I choose to cancel this contract

Customer Signature_____________________________Date_______

Terms I understand that a Ripple Representative is available upon request to inspect all furnace vent connections that may become unattached during the roofing process. I understand it is my responsibility to ensure these connections are secure or request a Ripple Representative to inspect the crucial connections, so that Carbon Monoxide does not enter my dwelling. I agree that this is my responsibility to ensure the safety of my family and agree to hold harmless Ripple Roofing and Construction of all liability associated with Carbon Monoxide and/or furnace vent connections. I further understand that Carbon Monoxide is a deadly Gas and Serious injury or death may occur as a result of furnace vents becoming disconnected.

In the event of rotten decking, Ripple will repair and/or replace rotten decking at the expense of Customer. Not replacing rotten decking will void your manufacturer warranty as well as your 10-Year Workmanship Warranty from Ripple.

A new roofing system will not remedy existing issues to framing, decking, fascia or soffit. If agreed upon in writing in the special instructions above, any of these type of repairs can be made at the expense and request of Customer prior to the installation of the roof. However, these repairs are not a part of the scope of work, unless otherwise noted and repairs to these items cannot be completed after the installation of the roofing system.

Venue: All suits arising out of or related to this agreement shall be filed in the courts of Travis County, Texas.

Warranty: Ripple includes a 10-Year Workmanship Warranty on all Ripple roofing systems, which protects against poor workmanship. Repairs include a 1-year workmanship warranty. Ripple is not responsible for normal wear and tear. See complete warranty information for details. Warranty begins upon payment in full of total contract amount and approved supplements. Warranty will be voided by unpaid contract.

Payments: Failure to make first payment may result in work stoppage. Ripple Roofing and Construction is not liable for damages that may occur due to work stoppage for failure to make initial contract payment to property. This includes but is not limited to flooding, water damage, theft of material, etc. Final roof payment is due to Ripple upon roof completion. Any and all trade payments are due upon completion of trade. Final payments not received within 30 days of completion will be considered failure to pay and will be subject to Failure to Pay Penalties. See Failure to Pay Penalties for further details.

Failure to Pay Penalties: 10% penalty assessed against the total remainder due, all discounts will be revoked at the sole discretion of Ripple and the account is subject to being sent to a 3rd party collections agency. Failure to pay may also result in Theft of Service charges being filed per TX law in addition to any necessary civil remedies.

Notice of Cancellation for Contract: If I choose to exercise my 3 Day Right of Rescission, I understand that by signing and dating in the space provided will make this contract null and void and no work will be provided by Ripple. I understand it is my responsibility to mail 1 copy of this cancelled contract to the corporate office of Ripple Roofing and Construction to 1000 Heritage Center Circle, Round Rock, TX 78664 or to tyler@rippleroofs.com post marked or time stamped no later than 3 business days after the date and time that this contract was executed. In the event that your insurance company denies a filed claim a pre-contract will be cancelled with proof of denial. Contracts cancelled outside of this period may result in a restocking fee not to exceed 25% of the total contracted amount.

Note: Ripple Sales Representatives do not make verbal contracts and any terms not disclosed on a contract are considered null and void.

Payment Methods: We accept personal checks, money orders, cashiers checks or credit cards. (Make checks payable to Ripple Roofing and Construction) There is a 3.0% processing fee for credit card transactions. Returned checks will result in a returned check fee of $50 and/or potential hot check charges filed with the appropriate authorities.

*** TX law requires a person insured under a property insurance policy to pay any deductible applicable to a claim made under the policy. It is a violation of TX law for a seller of goods or services who reasonably expects to be paid wholly or partly from the proceeds of a property insurance claim to knowingly allow the insured person to fail to pay, or assist the insured person''s failure to pay, the applicable insurance deductible. ***'
WHERE name = 'Ripple Roofing & Construction';

-- If you want to check the update worked:
-- SELECT name, LEFT(contract_terms, 100) as terms_preview FROM public.companies WHERE contract_terms IS NOT NULL;
