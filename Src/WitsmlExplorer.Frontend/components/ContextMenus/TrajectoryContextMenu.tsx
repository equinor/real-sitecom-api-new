import { Typography } from "@equinor/eds-core-react";
import { MenuItem } from "@material-ui/core";
import React from "react";
import { DisplayModalAction, HideContextMenuAction, HideModalAction } from "../../contexts/operationStateReducer";
import { Server } from "../../models/server";
import Trajectory from "../../models/trajectory";
import Wellbore from "../../models/wellbore";
import { colors } from "../../styles/Colors";
import ContextMenu from "./ContextMenu";
import { menuItemText, StyledIcon } from "./ContextMenuUtils";
import { onClickPaste } from "./CopyUtils";
import { onClickCopy, onClickDelete, orderCopyJob, useClipboardTrajectoryReferences } from "./TrajectoryContextMenuUtils";

export interface TrajectoryContextMenuProps {
  dispatchOperation: (action: HideModalAction | HideContextMenuAction | DisplayModalAction) => void;
  trajectories: Trajectory[];
  selectedServer: Server;
  servers: Server[];
  wellbore: Wellbore;
}

const TrajectoryContextMenu = (props: TrajectoryContextMenuProps): React.ReactElement => {
  const { dispatchOperation, trajectories, selectedServer, servers, wellbore } = props;
  const [trajectoryReferences] = useClipboardTrajectoryReferences();

  return (
    <ContextMenu
      menuItems={[
        <MenuItem key={"copy"} onClick={() => onClickCopy(selectedServer, trajectories, dispatchOperation)} disabled={trajectories.length === 0}>
          <StyledIcon name="copy" color={colors.interactive.primaryResting} />
          <Typography color={"primary"}>{menuItemText("copy", "trajectory", trajectories)}</Typography>
        </MenuItem>,
        <MenuItem
          key={"paste"}
          onClick={() => onClickPaste(servers, trajectoryReferences?.serverUrl, dispatchOperation, () => orderCopyJob(wellbore, trajectoryReferences, dispatchOperation))}
          disabled={trajectoryReferences === null}
        >
          <StyledIcon name="paste" color={colors.interactive.primaryResting} />
          <Typography color={"primary"}>{menuItemText("paste", "trajectory", trajectoryReferences?.trajectoryUids)}</Typography>
        </MenuItem>,
        <MenuItem key={"delete"} onClick={() => onClickDelete(trajectories, dispatchOperation)} disabled={trajectories.length === 0}>
          <StyledIcon name="deleteToTrash" color={colors.interactive.primaryResting} />
          <Typography color={"primary"}>{menuItemText("delete", "trajectory", trajectories)}</Typography>
        </MenuItem>
      ]}
    />
  );
};

export default TrajectoryContextMenu;
