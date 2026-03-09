- take name, pfp, descriptoin in step 1. (verify if arena handle by name_agent doesn't exists, very important, study arena.md to check get user info via handle. we will build a proxy api to be saved from arena api cors error while cheking for existing handle.)
- take personality of the agent in step 2 (do tell the user that they can change it later.) Ask which pair they want to mint in token, available optoin Avax (default) or Arena (dropdown)
- take payment in step 3 (smiilar to clawkai, if balance is enough we let them create the agent, if not we ask them to deposit $USDC/$USDT (only avax, no base or monad) to the address of their account (which is same as clawkai)). Once money is there. we show "Create my aegnt" button. Plans are different here. there is two plan:

    1. 39$/pm, comes with 10$ AI credit/month, 2GB RAM, 2vCPU, Agent Token 
    2. 69$/pm, comes with 20$ AI credit/month, 4GB RAM, 4vCPU, Agent Token

    (that's it)

- Create my agent button puts the name, pfp, description, personaity in supabase db for provision and hits a new provison endponint /arena-provsion. user goes to dashboard and they see that their agent is being created.. and we keep poling once thigns are ready.
- Telegram bot token is collected later from the Pair Devices modal (with BotFather instructions) once the gateway is up.

- how is /arena-provision different from existing /provison? it's same except for this type of provison we also create a new folder named "ArenaAgent" in it we store Main.md explanaing the agent. Main.md will have name, pfp and descrption and info about Arena platform. It will also refer to Arena.md that will explain entire arena api documentation. .env will have X-API-Key and a private key and public key (evm).

So the flow of /arena-provision will be like this:
 - create a new evm wallet address/private key, funds 0.05 $AVAX to the address from our FAUCET_ADDRESS.

 - register agent on arena with name, descriptoin and pfp and get the X-API_KEY (study our actions/Arena.md to know how to register an agent on arena)
 - launcha  new token on arena. now this itself is a very big step as we need to understand how to launch a token on arena. First we will use vault contract to create a new vault for each agent, study how /contract works btw for better understand, so each agent we will create a unique vault. in db we store agent_handle-vault_address, study the supabase/migration in gladius launcher, there is a table creation called vault where we link a X handle with a vault address, so here we are simply mappinng arena agent handle with a vault address. then we launch new token with creatorAddress as the vault address and we create and sign the txn by the agent address we created earlier. once token is launched, we get the token address and store the contract address of the token too. Study token-launch-script to understand how luanching works, it can create tokne with AVAX or Arena pair


 - dump the agent info with claw link, CA in a table called ArenaAgent where each agent launched will have refercen to the claw, initially claw will be null buce once provision is successful and agent is created on arena we update the claw reference in ArenaAgent table. dashboard cna poll this table info to see if agent is created or not.


- but remember, 
 start provisoin and in it we make sure to create a new folder named "ArenaAgent" and in it we create Main.md and Arena.md and .env with the info mentioned above. and token.md as well taht will have token info we just created. Main.md should convice the openclaw that on arena it has a token, profile, persona etc.



we build out new dashboard in gladius launcher for users. in it we show same things as clawkai dashboard does like logs, modal change feature for text/image, restart gateway, open gateway link, pair telegram etc. (dashboard will exact same as clawkai with all same features but theme of dashbaord for gladius will be differen and we will use same theme as how the gladius launcher website users.) but we also show token link, arena profile link.



